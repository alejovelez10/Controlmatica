# frozen_string_literal: true

require "test_helper"

# El que envia y anota los mensajes salientes (paquete 17).
class Whatsapp::RespondedorTest < ActiveSupport::TestCase
  # Visto en la prueba real del 2026-10-19: si el mensaje YA salio y lo que
  # falla es anotarlo, no puede parecer que el envio fallo, o el agente lo
  # manda otra vez.
  test "si anotar el mensaje falla despues de enviarlo, no levanta y devuelve el wamid" do
    WhatsappMessage.create!(wamid: "wamid.repetido", direction: WhatsappMessage::SALIENTE, status: "enviado")
    cliente = FakeWhatsappClient.new
    def cliente.enviar_texto(*) = "wamid.repetido"

    respondedor = Whatsapp::Respondedor.new(destino: { wa_id: "573001234567" }, client: cliente)
    assert_equal "wamid.repetido", respondedor.texto("hola")
  end

  test "un envio normal queda anotado como saliente" do
    cliente = FakeWhatsappClient.new
    respondedor = Whatsapp::Respondedor.new(destino: { wa_id: "573001234567" }, usuario: users(:ingeniero),
                                            client: cliente)
    wamid = respondedor.texto("hola")
    anotado = WhatsappMessage.find_by(wamid: wamid)
    assert_equal WhatsappMessage::SALIENTE, anotado.direction
    assert_equal users(:ingeniero), anotado.user
  end
end
