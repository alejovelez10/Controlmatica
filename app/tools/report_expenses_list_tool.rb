# frozen_string_literal: true

class ReportExpensesListTool < ApplicationTool
  tool_name "report_expenses_list"
  description "Lista gastos/legalizaciones de un centro de costo. Filtros opcionales: cost_center_id, " \
              "user_invoice_id, q (nombre/descripción), budget_status, currency, accounting_approved y " \
              "rango de fechas de factura. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      cost_center_id:      { type: "integer", description: "Filtra por centro de costo" },
      user_invoice_id:     { type: "integer", description: "Filtra por usuario que reporta el gasto" },
      q:                   { type: "string",  description: "Texto en nombre o descripción" },
      budget_status:       { type: "string",  description: "Estado presupuestal del gasto",
                             enum: %w[sin_presupuesto aprobado excedido] },
      currency:            { type: "string",  description: "Moneda ISO 4217 del comprobante (#{Currency::CODES.join(', ')})" },
      accounting_approved: { type: "boolean", description: "Filtra por aprobación contable" },
      date_from:           { type: "string",  description: "Fecha de factura desde, YYYY-MM-DD" },
      date_to:             { type: "string",  description: "Fecha de factura hasta, YYYY-MM-DD" },
      limit:               { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  # LISTA CANONICA de 00-ARQUITECTURA 7.7. Tres paquetes la amplian y el ORDEN
  # esta fijado ahi: 1-16 las actuales, 17-19 (budget_*) las agrega el 11,
  # 20-26 (moneda) este paquete, 27-28 (contabilidad) el 06. Cada uno agrega
  # SOLO las suyas, sin borrar ni reordenar las ajenas; el criterio compartido
  # final es KEYS.size == 28 y KEYS.uniq == KEYS.
  #
  # Cuando este paquete se mergea, el 11 y el 06 todavia no estan: las claves
  # 17-19 se insertan DELANTE de las de moneda al resolver ese merge.
  #
  # PAQUETE 06: agrega SOLO las claves 27 y 28. `receipt_file_url` es un metodo
  # del modelo, no una columna, y devuelve la URL firmada de CarrierWave; para el
  # agente eso basta, y a diferencia del navegador no deja el enlace abierto once
  # minutos hasta que caduca.
  KEYS = %i[id cost_center_id user_invoice_id invoice_name invoice_date invoice_number invoice_type
            invoice_value invoice_tax invoice_total description identification
            type_identification_id payment_type_id is_acepted created_at
            budget_status budget_reason expense_budget_id
            currency foreign_value foreign_tax foreign_total
            exchange_rate exchange_rate_date exchange_rate_source
            accounting_approved receipt_file_url].freeze

  def self.call(server_context:, cost_center_id: nil, user_invoice_id: nil, q: nil,
                budget_status: nil, currency: nil, accounting_approved: nil,
                date_from: nil, date_to: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = ReportExpense.all
    scope = scope.where(cost_center_id: cost_center_id) if cost_center_id
    scope = scope.where(user_invoice_id: user_invoice_id) if user_invoice_id
    scope = scope.where("LOWER(invoice_name) LIKE :t OR LOWER(description) LIKE :t", t: "%#{q.downcase}%") if q.present?
    scope = scope.where(budget_status: budget_status) if budget_status.present?
    scope = scope.where(currency: Currency.normalize(currency)) if currency.present?
    # SE COMPARA CONTRA nil, NO CONTRA EL VALOR: con `if accounting_approved` el
    # filtro `false` —que es justo el que pide contabilidad, "muestrame lo
    # pendiente"— se perderia en silencio y devolveria la lista completa.
    unless accounting_approved.nil?
      scope = scope.where(accounting_approved: ActiveModel::Type::Boolean.new.cast(accounting_approved))
    end
    scope = scope.where("invoice_date >= ?", date_from) if date_from.present?
    scope = scope.where("invoice_date <= ?", date_to) if date_to.present?
    json(Mcp::Serialize.collection(scope.order(created_at: :desc).limit(limit), KEYS))
  end
end
