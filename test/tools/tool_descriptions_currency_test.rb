require "test_helper"

# Guarda anti-regresion de las descripciones de moneda de las tools MCP: las
# cuatro deben interpolar Currency::CODES y ninguna puede volver a traer la
# lista de 3 monedas escrita a mano.
class ToolDescriptionsCurrencyTest < ActiveSupport::TestCase
  TOOLS_CON_CAMPO_CURRENCY = [
    ExchangeRatesGetTool,
    ReportExpensesCreateTool,
    ExpenseRulesValidateTool,
    ReportExpensesListTool
  ].freeze

  test "las cuatro tools mencionan los 7 codigos en la descripcion de currency" do
    TOOLS_CON_CAMPO_CURRENCY.each do |tool|
      desc = tool.input_schema.to_h[:properties][:currency][:description]

      Currency::CODES.each do |code|
        assert_includes desc, code, "#{tool.name} no menciona #{code} en la descripcion de currency"
      end
    end
  end

  test "ninguna tool trae la lista de 3 monedas escrita a mano" do
    TOOLS_CON_CAMPO_CURRENCY.each do |tool|
      desc = tool.input_schema.to_h[:properties][:currency][:description]

      refute_includes desc, "COP, USD, EUR."
      refute_includes desc, "(COP, USD, EUR)"
    end
  end
end
