# frozen_string_literal: true

# Lookup: opciones de tipo de identificación / tipo de pago para report_expenses.
class ReportExpenseOptionsListTool < ApplicationTool
  # Unica fuente de los dos literales de categoria. Viven aca y no en el modelo
  # porque report_expense_option.rb esta fuera de alcance por contrato, y
  # compartir constantes entre tools ya es el patron del repo (esta misma
  # constante KEYS la consume records_search_tool.rb). El orden del array
  # importa: hay un test que lo fija.
  CATEGORY_TIPO  = "Tipo"
  CATEGORY_MEDIO = "Medio de pago"
  CATEGORIES     = [CATEGORY_TIPO, CATEGORY_MEDIO].freeze

  tool_name "report_expense_options_list"
  description "Lista las opciones (tipos de gasto y tipos de pago) usadas en los gastos/legalizaciones. " \
              "Filtro opcional `category`, con dos únicos valores posibles: \"Tipo\" y \"Medio de pago\". " \
              "Úsala para obtener type_identification_id y payment_type_id válidos."
  input_schema(
    properties: {
      category: {
        type: "string",
        enum: CATEGORIES,
        description: "Filtra por categoría. Solo dos valores: \"Tipo\" (los tipos de gasto; " \
                     "de ahí sale type_identification_id) y \"Medio de pago\" (de ahí sale " \
                     "payment_type_id). Omítelo para ver las dos."
      }
    },
    required: []
  )

  KEYS = %i[id name category created_at].freeze

  def self.call(server_context:, category: nil, **_ignored)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    # Filtro EXCLUSIVO de esta tool: existe para alimentar el menu del agente y
    # ese es su unico proposito. Un default_scope en el modelo haria lo mismo
    # en apariencia y dejaria fuera, en silencio, al formulario web, a la
    # plantilla de importacion y al indice del import
    # (ReportExpense.indice_de_catalogos).
    scope = ReportExpenseOption.where(used_by_ai: true)
    if category.present?
      canonica = normalize_category(category)
      unless canonica
        return text("Error: la categoría #{category.to_s.strip.inspect} no existe. Las únicas " \
                    "categorías son #{CATEGORY_TIPO.inspect} (tipos de gasto → " \
                    "type_identification_id) y #{CATEGORY_MEDIO.inspect} (→ payment_type_id). " \
                    "Vuelve a llamar con una de esas dos, o sin category para ver todas.")
      end
      scope = scope.where(category: canonica)
    end
    json(Mcp::Serialize.collection(scope.order(:category, :name), KEYS))
  end

  # Tolerancia de FORMA (espacios, NBSP, mayúsculas), nunca de contenido:
  # "tipo de gasto" y "Medio" tienen que dar nil. Copiado de
  # ReportExpense.clave_de_catalogo — es la forma que ya usa el repo para
  # comparar contra catálogos, no se inventa otra acá. Sin start_with?, sin
  # distancia de edición, sin include?: adivinar es exactamente el bug que
  # este cambio cierra.
  def self.normalize_category(value)
    clave = value.to_s.tr(" ", " ").gsub(/\s+/, " ").strip.downcase
    CATEGORIES.find { |canonica| canonica.downcase == clave }
  end
end
