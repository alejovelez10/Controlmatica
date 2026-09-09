# frozen_string_literal: true

# Envoltorio de ExchangeRateService.fetch (paquete 05). Dueño único: paquete 11.
#
# ⚠️ NO se envuelve en as_actor: es lectura pura y, aunque `fetch` puede escribir
# en `exchange_rates`, ese modelo no tiene callbacks que lean User.current. Si
# alguien le agregara auditoría, esta tool tendría que envolverse.
#
# ⚠️ Y NUNCA se llama desde dentro de report_expenses_create: `fetch` hace HTTP y
# la creación corre dentro del lock del centro de costo (§2.7, "nada de llamadas
# HTTP dentro del lock"). El agente pide la tasa primero y la manda como
# argumento; ese es todo el diseño.
class ExchangeRatesGetTool < ApplicationTool
  tool_name "exchange_rates_get"
  description "Tasa de cambio a pesos colombianos (COP) para una moneda y una fecha. Devuelve " \
              "cuántos COP vale 1 unidad de la moneda. Si la fuente no tiene esa fecha devuelve la " \
              "del último día hábil anterior y lo indica en rate_date (distinto de requested_date). " \
              "Si no hay tasa devuelve error: NO inventes una tasa, pídesela a la persona."
  input_schema(
    properties: {
      currency: { type: "string", description: "Código ISO 4217. Válidos: #{Currency::CODES.join(', ')}" },
      date:     { type: "string", description: "Fecha YYYY-MM-DD (normalmente la fecha del comprobante)" }
    },
    required: %w[currency date]
  )

  # Las 7 claves canónicas de §7.7, con `id` y con `effective_date`.
  # `records_search(entity: "exchange_rates")` reutiliza esta misma constante.
  KEYS = %i[id currency rate_date effective_date rate_to_cop source fetched_at].freeze

  def self.call(currency:, date:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    code = Currency.normalize(currency)
    unless Currency.valid?(code)
      return text("Error: moneda no soportada. Válidas: #{Currency::CODES.join(', ')}")
    end

    begin
      d = Date.iso8601(date.to_s)
    rescue ArgumentError, TypeError
      return text("Error: fecha inválida, usa YYYY-MM-DD")
    end

    # Un peso vale un peso: ni red, ni tabla, ni servicio.
    if code == Currency::DEFAULT
      return json(currency: Currency::DEFAULT, requested_date: d.to_s, rate_date: d.to_s,
                  rate_to_cop: "1.0", source: "identity", cached: true, stale: false,
                  message: "El comprobante ya está en pesos: no hace falta tasa de cambio.")
    end

    result = ExchangeRateService.fetch(currency: code, date: d)
    return text("Error: #{result.errors.join(', ')}") unless result.ok?

    rate = result.value
    json(currency: rate.currency,
         requested_date: rate.requested_date.to_s,
         rate_date: rate.rate_date.to_s,
         # to_s("F") y no to_s: BigDecimal#to_s da "0.41205e4".
         rate_to_cop: rate.rate_to_cop.to_d.to_s("F"),
         source: rate.source,
         cached: rate.cached,
         stale: rate.stale,
         message: mensaje(rate))
  end

  # El aviso de "esta no es la tasa del día que pediste" va redactado desde el
  # servidor: es justo lo que un modelo omite cuando resume.
  def self.mensaje(rate)
    if rate.rate_date.to_s != rate.requested_date.to_s
      "La tasa del #{rate.requested_date} no estaba publicada; se aplicó la del " \
        "#{rate.rate_date}: #{ExpenseBudgetService.money(rate.rate_to_cop)} por 1 #{rate.currency}."
    else
      "#{ExpenseBudgetService.money(rate.rate_to_cop)} por 1 #{rate.currency} el #{rate.rate_date}."
    end
  end
  private_class_method :mensaje
end
