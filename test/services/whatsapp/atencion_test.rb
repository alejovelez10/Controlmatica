# frozen_string_literal: true

require "test_helper"
require "minitest/mock"

# Atencion de un mensaje entrante (paquete 17, fase 1).
class Whatsapp::AtencionTest < ActiveSupport::TestCase
  include WhatsappTestHelpers

  # Estas pruebas son de la fase 1 ("Recibido"). Sin la api key de Claude, la
  # atencion no llama al agente aunque el entorno de quien corre la suite la
  # tenga cargada.
  setup do
    @anthropic_previa = ENV.delete("ANTHROPIC_API_KEY")
  end

  teardown do
    ENV["ANTHROPIC_API_KEY"] = @anthropic_previa if @anthropic_previa
  end

  def entrante(wamid: "wamid.in.1", wa_id: "573001234567", bsuid: "CO.bsuid", tipo: "text", **extra)
    WhatsappMessage.create!({ wamid: wamid, direction: WhatsappMessage::ENTRANTE, wa_id: wa_id, bsuid: bsuid,
                              message_type: tipo, body: "hola" }.merge(extra))
  end

  test "a un empleado registrado le contesta y deja el mensaje procesado en su conversacion" do
    cliente = FakeWhatsappClient.new
    mensaje = entrante
    Whatsapp::Atencion.new(mensaje, client: cliente).call

    mensaje.reload
    assert mensaje.procesado?
    assert_equal users(:ingeniero), mensaje.user
    assert mensaje.whatsapp_conversation.abierta?
    assert_equal ["wamid.in.1"], cliente.leidos
    assert_equal [Whatsapp::Atencion::RECIBIDO], cliente.textos
    assert_equal 1, WhatsappMessage.salientes.where(user: users(:ingeniero)).count
  end

  test "a un numero no registrado le explica que no lo encuentra y no abre conversacion" do
    cliente = FakeWhatsappClient.new
    mensaje = entrante(wa_id: "573111111111", bsuid: nil)
    assert_no_difference -> { WhatsappConversation.count } do
      Whatsapp::Atencion.new(mensaje, client: cliente).call
    end
    assert_equal [Whatsapp::Identidad::NO_REGISTRADO], cliente.textos
    assert mensaje.reload.procesado?
  end

  test "un numero repetido en dos usuarios recibe el aviso de ambiguo" do
    cliente = FakeWhatsappClient.new
    Whatsapp::Atencion.new(entrante(wa_id: "573009999999", bsuid: nil), client: cliente).call
    assert_equal [Whatsapp::Identidad::AMBIGUO], cliente.textos
  end

  test "un PDF se descarga y queda guardado en el mensaje" do
    cliente = FakeWhatsappClient.new
    mensaje = entrante(tipo: "document", media_id: "media-1", media_mime: "application/pdf",
                       media_filename: "factura.pdf")
    Whatsapp::Atencion.new(mensaje, client: cliente).call

    mensaje.reload
    assert mensaje.media_file.present?
    assert_equal "%PDF-1.4 falso", File.binread(mensaje.media_file.path)
  end

  test "un archivo que el uploader no acepta recibe un aviso y no rompe el proceso" do
    cliente = FakeWhatsappClient.new(media: { bytes: "PK zip".b, mime: "application/zip", tamano: 6 })
    mensaje = entrante(tipo: "document", media_id: "media-1", media_mime: "application/zip",
                       media_filename: "cosa.zip")
    Whatsapp::Atencion.new(mensaje, client: cliente).call

    assert_equal [Whatsapp::Atencion::ARCHIVO_ILEGIBLE], cliente.textos
    assert mensaje.reload.procesado?
    assert mensaje.media_file.blank?
  end

  test "un tipo que no se maneja (ubicacion) recibe el aviso de no soportado" do
    cliente = FakeWhatsappClient.new
    Whatsapp::Atencion.new(entrante(tipo: "location"), client: cliente).call
    assert_equal [Whatsapp::Atencion::NO_SOPORTADO], cliente.textos
  end

  test "un error transitorio al descargar sube para que el job reintente" do
    error = Whatsapp::Client::Error.new("Meta caido", http_status: 503)
    cliente = FakeWhatsappClient.new(error_en: { descargar_media: error })
    mensaje = entrante(tipo: "image", media_id: "media-1", media_mime: "image/jpeg")
    assert_raises(Whatsapp::Client::Error) { Whatsapp::Atencion.new(mensaje, client: cliente).call }
    refute mensaje.reload.procesado?
  end

  test "si falla marcar como leido igual contesta" do
    cliente = FakeWhatsappClient.new(error_en: { marcar_leido: Whatsapp::Client::Error.new("x", http_status: 400) })
    Whatsapp::Atencion.new(entrante, client: cliente).call
    assert_equal [Whatsapp::Atencion::RECIBIDO], cliente.textos
  end

  test "con Claude y el MCP configurados, el mensaje lo atiende el agente" do
    llamado = nil
    agente = Object.new
    agente.define_singleton_method(:call) { llamado = true }
    ENV["ANTHROPIC_API_KEY"] = "sk-ant-x"
    mcp_previa = ENV["MCP_API_KEY"]
    ENV["MCP_API_KEY"] = "k"
    Agente::Turno.stub(:new, ->(**_kw) { agente }) do
      Whatsapp::Atencion.new(entrante, client: FakeWhatsappClient.new).call
    end
    assert llamado
  ensure
    ENV.delete("ANTHROPIC_API_KEY")
    ENV["MCP_API_KEY"] = mcp_previa
  end
end
