# Doble de prueba del modelo de vision. CERO RED y cero gemas nuevas: la
# arquitectura (6.7) decidio no meter WebMock, asi que el aislamiento se logra
# reemplazando el UNICO seam del servicio, `ReceiptExtractionService.call_vision_model`.
#
# Ningun test construye un `Anthropic::Client` ni abre un socket. De hecho el SDK
# de Anthropic ni siquiera esta instalado: lo instalara el agente de Taimes
# cuando implemente el seam (ver la cabecera de
# app/services/receipt_extraction_service.rb).
#
# Se autocarga con el `Dir[test/support/**/*.rb]` que test_helper.rb (paquete 01)
# ya recorre: PROHIBIDO agregar un require_relative en un test.
class FakeAnthropicClient
  attr_reader :calls

  # respuesta: el Hash crudo que devolveria el modelo, o una Exception (clase o
  # instancia) que se lanza, o el simbolo :refusal, o nil (respuesta sin bloque
  # de texto). Son los cuatro casos del contrato del seam.
  def initialize(respuesta)
    @respuesta = respuesta
    @calls     = []
  end

  # Misma firma que ReceiptExtractionService.call_vision_model(payload).
  def call(payload)
    @calls << payload
    raise @respuesta if @respuesta.is_a?(Exception) || (@respuesta.is_a?(Class) && @respuesta <= Exception)

    @respuesta
  end
end

# El helper vive AQUI y no en test_helper.rb: ese archivo tiene dueño unico
# (paquete 01, 7.2) y este paquete no lo toca.
module WithFakeExtractor
  # Ejecuta el bloque con el seam reemplazado. `fake.calls` guarda los payloads
  # que recibio, asi que se puede afirmar tanto "que se le mando al modelo"
  # (calls.first[:model]) como "no se llamo" (calls.empty?), que es como se
  # verifica que un rechazo temprano no gasta tokens.
  def with_fake_extractor(respuesta)
    fake = FakeAnthropicClient.new(respuesta)
    ReceiptExtractionService.stub(:call_vision_model, ->(payload) { fake.call(payload) }) do
      yield fake
    end
  end

  # Payload crudo del camino feliz. Se pisa por clave en cada test para no
  # repetir 12 lineas por caso.
  def payload_modelo(cambios = {})
    cambios   = cambios.stringify_keys
    confianza = cambios.delete("confidence")
    base = {
      "is_invoice"     => true,
      "unreadable"     => false,
      "provider_name"  => "Distribuidora El Sol SAS",
      "identification" => "900.123.456-7",
      "invoice_number" => "FE-4821",
      "invoice_date"   => "2026-07-14",
      "currency"       => "COP",
      "value"          => 420_168.0,
      "tax"            => 79_831.92,
      "total"          => 500_000.0,
      "description"    => "Papeleria y utiles de oficina",
      "confidence"     => confianza_alta
    }
    base.merge!(cambios)
    base["confidence"] = base["confidence"].merge(confianza.stringify_keys) if confianza
    base
  end

  def confianza_alta
    ReceiptExtractionService::CONFIDENCE_KEYS.index_with { 0.95 }
  end
end

# Excepciones del SDK de Anthropic, DECLARADAS AQUI SOLO PARA LOS TESTS.
#
# El gem todavia no esta instalado (lo instala Taimes junto con el seam), pero el
# mapeo de errores del servicio ya tiene que estar probado: se hace por NOMBRE de
# clase, asi que basta con que existan clases con estos nombres. La guarda hace
# que estas definiciones desaparezcan solas el dia que el gem real llegue: si el
# SDK ya definio la constante, no se toca nada.
unless defined?(Anthropic::Errors::APIConnectionError)
  module Anthropic
    module Errors
      class APIError < StandardError; end
      class APIConnectionError < APIError; end
      class APITimeoutError < APIConnectionError; end
      class APIStatusError < APIError; end
      class RateLimitError < APIStatusError; end
    end
  end
end
