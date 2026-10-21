# frozen_string_literal: true

require "test_helper"
require "minitest/mock"

# El trabajo que atiende cada mensaje entrante (paquete 17).
class Whatsapp::InboundJobTest < ActiveSupport::TestCase
  include WhatsappTestHelpers

  # Visto el 2026-10-20 con el primer mensaje real: un error que no era de Meta
  # ni de Claude dejaba el mensaje en "procesando" y a la persona sin respuesta.
  test "un error inesperado marca el mensaje como fallido y le avisa a la persona" do
    con_whatsapp do
      mensaje = WhatsappMessage.create!(wamid: "wamid.in.falla", direction: WhatsappMessage::ENTRANTE,
                                        wa_id: "573001234567", user: users(:ingeniero),
                                        message_type: "text", body: "hola")
      atencion = Object.new
      def atencion.call = raise(Errno::ENOENT, "app/prompts/agente/sistema.md")
      cliente = FakeWhatsappClient.new

      Whatsapp::Atencion.stub(:new, ->(*) { atencion }) do
        Whatsapp::Client.stub(:new, cliente) do
          assert_raises(Errno::ENOENT) { Whatsapp::InboundJob.perform_now(mensaje.id, "573001234567") }
        end
      end

      assert_equal "fallido", mensaje.reload.status
      assert_equal [Agente::Turno::FALLO], cliente.textos
    end
  end
end
