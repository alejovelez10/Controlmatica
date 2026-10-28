# frozen_string_literal: true

require "test_helper"
require "minitest/mock"

# El cotejo del comprobante por WhatsApp (2026-10-25). La IA lee el archivo de
# la conversacion AL PROPONER, el resumen dice lo que no cuadra cuando todavia
# se puede tocar Corregir, y al confirmar la lectura viaja al gasto por el
# contexto del MCP en proceso. Claude falso para el agente y para la lectura.
class Agente::CotejoTest < ActiveSupport::TestCase
  include McpTestHelpers
  include WithFakeExtractor

  ENV_CLAVES = %w[ANTHROPIC_API_KEY RECEIPT_EXTRACTION_ENABLED MCP_API_KEY].freeze

  setup do
    @env_previo = ENV.to_hash.slice(*ENV_CLAVES)
    ENV["MCP_API_KEY"] = VALID_KEY
    ENV["ANTHROPIC_API_KEY"] = "sk-ant-de-mentira-no-se-usa"
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"

    @usuario = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    ExpenseRule.update_all(active: false)
    as_user(users(:admin)) do
      ExpenseRule.create!(name: "Discrepancia en el recibo", active: true, applies_to_all_roles: true,
                          check_duplicates: false, mandatory: false, cross_check_receipt: true)
    end
    @conversacion = WhatsappConversation.create!(user: @usuario, wa_id: "573001234567",
                                                 last_inbound_at: Time.current)
    @whatsapp = FakeWhatsappClient.new
    @respondedor = Whatsapp::Respondedor.new(destino: { wa_id: "573001234567" }, usuario: @usuario,
                                             conversacion: @conversacion, client: @whatsapp)
  end

  teardown do
    ENV_CLAVES.each { |k| @env_previo.key?(k) ? ENV[k] = @env_previo[k] : ENV.delete(k) }
  end

  def entrante(texto = "listo", tipo: "text", payload: {}, **extra)
    WhatsappMessage.create!({ wamid: "wamid.#{SecureRandom.hex(4)}", direction: WhatsappMessage::ENTRANTE,
                              wa_id: "573001234567", message_type: tipo, body: texto, payload: payload,
                              user: @usuario, whatsapp_conversation: @conversacion }.merge(extra))
  end

  def foto
    mensaje = entrante("", tipo: "image", media_id: "media-1", media_mime: "image/jpeg",
                           media_filename: "comprobante_factura.jpg")
    mensaje.media_file = File.open(Rails.root.join("test/fixtures/files/comprobante_factura.jpg"))
    mensaje.save!
    mensaje
  end

  def turno(mensaje, *respuestas)
    Agente::Turno.new(mensaje: mensaje, usuario: @usuario, conversacion: @conversacion,
                      respondedor: @respondedor, claude: FakeClaudeClient.new(*respuestas)).call
  end

  def confirmar!
    id = @conversacion.reload.estado.dig("borrador", "id")
    turno(entrante("Confirmar", tipo: "interactive",
                                payload: { interactive: { type: "button_reply",
                                                          button_reply: { id: "borrador:confirmar:#{id}",
                                                                          title: "Confirmar" } } }))
  end

  # Lo mismo que lee el extractor falso (payload_modelo): FE-4821, 2026-07-14,
  # NIT 900.123.456-7, total $500.000.
  def args_de_gasto(extra = {})
    { cost_center_id: @centro.id, type_identification_id: report_expense_options(:opcion_tipo).id,
      payment_type_id: report_expense_options(:opcion_pago).id, invoice_name: "Distribuidora El Sol",
      identification: "900123456", invoice_number: "FE-4821", invoice_date: "2026-07-14",
      invoice_value: 420_168, invoice_tax: 79_832, invoice_total: 500_000, currency: "COP",
      description: "Papelería", hallazgos_politica: [], resumen: "Voy a registrar este gasto" }.merge(extra)
  end

  test "el resumen dice lo que no cuadra y el gasto confirmado queda pendiente con la razon" do
    with_fake_extractor(payload_modelo) do |fake|
      turno(foto, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto(invoice_total: 550_000,
                                                                          invoice_value: 550_000,
                                                                          invoice_tax: 0)]))

      resumen = @whatsapp.enviados.last[:texto]
      assert_includes resumen, "El total del comprobante es $500.000 y se registró $550.000"
      assert_includes resumen, "toca Corregir"
      assert_equal "leido", @conversacion.reload.estado.dig("borrador", "lectura", "estado")

      confirmar!
      assert_equal 1, fake.calls.size, "al confirmar no se vuelve a leer el comprobante"
    end

    gasto = ReportExpense.order(:id).last
    refute gasto.aceptado?
    assert_equal "diferencias", gasto.receipt_check["estado"]
    assert_equal ["El total del comprobante es $500.000 y se registró $550.000"], gasto.rule_hits.map(&:message)
    assert_includes @whatsapp.textos.last, "Quedó sin aprobar porque: El total del comprobante es $500.000"
  end

  test "si cuadra, el gasto no queda marcado" do
    with_fake_extractor(payload_modelo) do
      turno(foto, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
      refute_includes @whatsapp.enviados.last[:texto], "comprobante es"
      confirmar!
    end

    gasto = ReportExpense.order(:id).last
    assert_equal "coincide", gasto.receipt_check["estado"]
    assert_empty gasto.rule_hits
  end

  test "una correccion sobre el mismo archivo no lo vuelve a leer" do
    with_fake_extractor(payload_modelo) do |fake|
      archivo = foto
      turno(archivo, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto(invoice_total: 550_000)]))
      turno(entrante("el total es 500 mil"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))

      assert_equal 1, fake.calls.size
    end
  end

  test "sin foto en la conversacion el gasto queda para revision" do
    with_fake_extractor(payload_modelo) do |fake|
      turno(entrante, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
      confirmar!
      assert_empty fake.calls
    end

    assert_equal ["No se pudo cotejar el comprobante: el gasto no tiene comprobante"],
                 ReportExpense.order(:id).last.rule_hits.map(&:message)
  end

  # Revision del 2026-10-25: un gasto creado sin foto seguia marcado «sin
  # comprobante» aunque despues se le adjuntara.
  test "la foto que llega despues se lee al adjuntarla y el gasto sale del informe si cuadra" do
    with_fake_extractor(payload_modelo) do |fake|
      turno(entrante, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
      confirmar!
      gasto = ReportExpense.order(:id).last
      assert_equal ["No se pudo cotejar el comprobante: el gasto no tiene comprobante"], gasto.rule_hits.map(&:message)

      turno(foto, FakeClaudeClient.tools(["adjuntar_comprobante", { report_expense_id: gasto.id }]),
            FakeClaudeClient.texto("Listo, quedó adjunto."))

      assert_equal 1, fake.calls.size
      gasto.reload
      assert gasto.receipt_file.present?
      assert_equal "coincide", gasto.receipt_check["estado"]
      assert_empty gasto.rule_hits
    end
  end

  # Por HTTP no hay lectura que traer: con una regla de cotejo el gasto nace
  # «sin comprobante» y no se aprueba solo hasta que se adjunte y se lea.
  test "un gasto creado por el MCP sin lectura queda para revision" do
    respuesta = ReportExpensesCreateTool.call(
      server_context: ctx(actor_phone: "+57 300 123 4567"),
      **args_de_gasto.except(:hallazgos_politica, :resumen)
    )

    gasto = ReportExpense.find(tool_json(respuesta)["id"])
    refute gasto.aceptado?
    assert_equal ["No se pudo cotejar el comprobante: el gasto no tiene comprobante"], gasto.rule_hits.map(&:message)
  end

  test "sin regla que pida el cotejo no se lee nada" do
    ExpenseRule.update_all(active: false)

    with_fake_extractor(payload_modelo) do |fake|
      turno(foto, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
      assert_empty fake.calls
    end
    assert_nil @conversacion.reload.estado.dig("borrador", "lectura")
  end
end
