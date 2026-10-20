# Acceso a la API de Claude (paquete 17).
#
# HTTP directo y no la gema oficial `anthropic`: la gema exige Ruby >= 3.2 y el
# proyecto esta en 3.1.2. Cuando se suba Ruby, Claude::Client se cambia por la
# gema y el resto no deberia enterarse.
module Claude
  API_HOST = "https://api.anthropic.com".freeze
  API_VERSION = "2023-06-01".freeze

  # Los modelos que aceptan `fallbacks: "default"`: si los clasificadores de
  # seguridad declinan un pedido, la API lo reintenta del lado del servidor con
  # el modelo que Anthropic recomienda para esa categoria. Haiku NO lo acepta
  # (con "default" un rechazo sigue siendo rechazo), por eso es lista cerrada.
  MODELOS_CON_FALLBACK = %w[claude-opus-5-5 claude-opus-5 claude-sonnet-5-5 claude-fable-5-1].freeze
  BETA_FALLBACK = "server-side-fallback-2026-07-01".freeze

  module_function

  def api_key = ENV["ANTHROPIC_API_KEY"]

  def configurado?
    api_key.present?
  end

  # Agrega a un cuerpo de /v1/messages lo que depende del modelo. Devuelve
  # [cuerpo, betas].
  def preparar(cuerpo, betas: [])
    cuerpo = cuerpo.deep_dup
    betas = betas.dup
    if MODELOS_CON_FALLBACK.include?(cuerpo[:model].to_s)
      cuerpo[:fallbacks] = "default"
      betas << BETA_FALLBACK
    end
    [cuerpo, betas.uniq]
  end

  # El primer bloque de texto de una respuesta. Las respuestas pueden traer
  # antes bloques `thinking` (vacios por defecto): se lee por tipo, nunca por
  # posicion.
  def texto_de(respuesta)
    Array(respuesta["content"]).find { |bloque| bloque["type"] == "text" }&.dig("text")
  end
end
