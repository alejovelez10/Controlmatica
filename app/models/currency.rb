# Catalogo de monedas soportadas. Es una CONSTANTE RUBY, no una tabla
# (00-ARQUITECTURA.md 1.6): son tres codigos que cambian una vez cada varios
# años, y una tabla obligaria a sembrarla en desarrollo, en test, en staging y
# en produccion para que el formulario no salga vacio.
#
# Clase sin tabla: no hereda de ApplicationRecord a proposito. Zeitwerk la
# autocarga igual porque vive en app/models/ con el nombre del archivo.
class Currency
  CATALOG = [
    { code: "COP", name: "Peso colombiano", symbol: "$",   decimals: 2 },
    { code: "USD", name: "Dólar",           symbol: "US$", decimals: 2 },
    { code: "EUR", name: "Euro",            symbol: "€",   decimals: 2 }
  ].freeze

  CODES   = CATALOG.map { |c| c[:code] }.freeze
  DEFAULT = "COP"

  # Forma que consume react-select en los dos formularios de gasto. La publica
  # el layout como window.CM_CURRENCIES (helper get_currencies).
  def self.options
    CATALOG.map { |c| { label: "#{c[:code]} — #{c[:name]}", value: c[:code] } }
  end

  # normalize primero SIEMPRE: la moneda llega de un <select>, de una celda de
  # Excel y de la tool MCP, y en los tres casos puede venir " usd " o "usd".
  def self.valid?(code) = CODES.include?(normalize(code))

  def self.find(code) = CATALOG.find { |c| c[:code] == normalize(code) }

  def self.normalize(code) = code.to_s.strip.upcase

  # "Extranjera" = valida y distinta de COP. Un codigo basura NO es extranjero:
  # devolver true aqui haria que apply_currency_conversion intentara convertir
  # un gasto que la validacion va a rechazar de todos modos.
  def self.foreign?(code) = valid?(code) && normalize(code) != DEFAULT
end
