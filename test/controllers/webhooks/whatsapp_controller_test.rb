# frozen_string_literal: true

require "test_helper"

# Webhook de Meta (paquete 17): alta, firma, duplicados, estados y kill switch.
class Webhooks::WhatsappControllerTest < ActionDispatch::IntegrationTest
  include WhatsappTestHelpers

  def post_webhook(payload, firma: nil)
    cuerpo = payload.to_json
    post "/webhooks/whatsapp", params: cuerpo,
                               headers: { "Content-Type" => "application/json",
                                          "X-Hub-Signature-256" => firma || firmar(cuerpo) }
  end

  test "el GET de alta devuelve el challenge cuando el token coincide" do
    con_whatsapp do
      get "/webhooks/whatsapp", params: { "hub.mode" => "subscribe", "hub.verify_token" => "verificar-123",
                                          "hub.challenge" => "1158201444" }
      assert_response :success
      assert_equal "1158201444", response.body
    end
  end

  test "el GET de alta responde 403 con un token equivocado" do
    con_whatsapp do
      get "/webhooks/whatsapp", params: { "hub.mode" => "subscribe", "hub.verify_token" => "otro",
                                          "hub.challenge" => "1" }
      assert_response :forbidden
    end
  end

  test "el GET de alta funciona aunque el canal este apagado" do
    con_whatsapp(habilitado: false) do
      get "/webhooks/whatsapp", params: { "hub.mode" => "subscribe", "hub.verify_token" => "verificar-123",
                                          "hub.challenge" => "42" }
      assert_equal "42", response.body
    end
  end

  test "un mensaje firmado se guarda y se encola" do
    con_whatsapp do
      assert_enqueued_with(job: Whatsapp::InboundJob) do
        assert_difference -> { WhatsappMessage.count }, 1 do
          post_webhook(webhook_de_mensaje(mensaje_de_texto("hola")))
        end
      end
      assert_response :success

      mensaje = WhatsappMessage.last
      assert_equal "wamid.texto.1", mensaje.wamid
      assert_equal WhatsappMessage::ENTRANTE, mensaje.direction
      assert_equal "573001234567", mensaje.wa_id
      assert_equal "CO.bsuid-ingeniero", mensaje.bsuid
      assert_equal "hola", mensaje.body
    end
  end

  test "un reintento de Meta con el mismo wamid no se guarda ni se encola dos veces" do
    con_whatsapp do
      post_webhook(webhook_de_mensaje(mensaje_de_texto("hola")))
      assert_no_difference -> { WhatsappMessage.count } do
        assert_no_enqueued_jobs(only: Whatsapp::InboundJob) do
          post_webhook(webhook_de_mensaje(mensaje_de_texto("hola")))
        end
      end
      assert_response :success
    end
  end

  test "una firma invalida responde 401 y no guarda nada" do
    con_whatsapp do
      assert_no_difference -> { WhatsappMessage.count } do
        post_webhook(webhook_de_mensaje(mensaje_de_texto("hola")), firma: "sha256=#{'0' * 64}")
      end
      assert_response :unauthorized
    end
  end

  test "con el canal apagado contesta 200 y no guarda nada" do
    con_whatsapp(habilitado: false) do
      assert_no_difference -> { WhatsappMessage.count } do
        post_webhook(webhook_de_mensaje(mensaje_de_texto("hola")))
      end
      assert_response :success
    end
  end

  test "los mensajes a otro numero de la misma cuenta se ignoran" do
    con_whatsapp do
      assert_no_difference -> { WhatsappMessage.count } do
        post_webhook(webhook_de_mensaje(mensaje_de_texto("hola"), phone_number_id: "1080945891778869"))
      end
      assert_response :success
    end
  end

  test "un aviso de entrega actualiza el mensaje saliente y no se procesa como mensaje" do
    saliente = WhatsappMessage.create!(wamid: "wamid.saliente.9", direction: WhatsappMessage::SALIENTE,
                                       status: "enviado")
    payload = webhook_de_mensaje(mensaje_de_texto("x"))
    valor = payload[:entry][0][:changes][0][:value]
    valor.delete(:messages)
    valor[:statuses] = [{ id: "wamid.saliente.9", status: "read", recipient_id: "573001234567" }]

    con_whatsapp do
      assert_no_enqueued_jobs(only: Whatsapp::InboundJob) do
        post_webhook(payload)
      end
    end
    assert_equal "read", saliente.reload.status
  end

  test "un cuerpo que no es JSON igual responde 200" do
    con_whatsapp do
      cuerpo = "esto no es json"
      post "/webhooks/whatsapp", params: cuerpo,
                                 headers: { "Content-Type" => "application/json",
                                            "X-Hub-Signature-256" => firmar(cuerpo) }
      assert_response :success
    end
  end
end
