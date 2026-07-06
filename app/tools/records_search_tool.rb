# frozen_string_literal: true

# Búsqueda genérica sobre cualquier módulo, filtrando por CUALQUIER campo.
# Complementa a las tools <modulo>_list: cuando el agente necesita buscar por un
# campo que no tiene filtro dedicado (ej. un centro de costo por `code`, un cliente
# por `nit`, un material por `sales_number`), usa esta tool.
class RecordsSearchTool < ApplicationTool
  tool_name "records_search"
  description "Búsqueda genérica de registros en cualquier módulo, filtrando por CUALQUIER campo. " \
              "Pasa `entity` (el módulo) y `filters` (pares campo:valor — texto = coincidencia parcial, " \
              "números/ids/booleanos/fechas = exacto) y/o `q` (texto libre que busca en todos los campos de " \
              "texto). Ej: entity='cost_centers', filters={\"code\":\"SER-CLI0087\"}; o entity='customers', " \
              "filters={\"nit\":\"805757055\"}. Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      entity: {
        type: "string",
        description: "Módulo a buscar",
        enum: %w[cost_centers customers contacts providers materials contractors reports
                 sales_orders customer_invoices material_invoices report_expenses shifts
                 expense_ratios customer_reports commissions quotations users
                 notification_alerts parameterizations rols report_expense_options]
      },
      filters: {
        type: "object",
        description: "Pares campo:valor. Solo se aplican campos que existan en la entidad. " \
                     "Texto → coincidencia parcial (LIKE); id/número/booleano/fecha → exacto."
      },
      q:     { type: "string",  description: "Texto libre; busca en todas las columnas de texto de la entidad" },
      limit: { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: ["entity"]
  )

  # entity => modelo + cómo serializar (reutiliza las KEYS de cada *_list tool).
  def self.registry
    @registry ||= {
      "cost_centers"           => [CostCenter,          ->(r) { Mcp::CostCenterSerializer.summary(r) }],
      "customers"              => [Customer,             CustomersListTool::KEYS],
      "contacts"               => [Contact,              ContactsListTool::KEYS],
      "providers"              => [Provider,             ProvidersListTool::KEYS],
      "materials"              => [Material,             MaterialsListTool::KEYS],
      "contractors"            => [Contractor,           ContractorsListTool::KEYS],
      "reports"                => [Report,               ReportsListTool::KEYS],
      "sales_orders"           => [SalesOrder,           SalesOrdersListTool::KEYS],
      "customer_invoices"      => [CustomerInvoice,      CustomerInvoicesListTool::KEYS],
      "material_invoices"      => [MaterialInvoice,      MaterialInvoicesListTool::KEYS],
      "report_expenses"        => [ReportExpense,        ReportExpensesListTool::KEYS],
      "shifts"                 => [Shift,                ShiftsListTool::KEYS],
      "expense_ratios"         => [ExpenseRatio,         ExpenseRatiosListTool::KEYS],
      "customer_reports"       => [CustomerReport,       CustomerReportsListTool::KEYS],
      "commissions"            => [Commission,           CommissionsListTool::KEYS],
      "quotations"             => [Quotation,            QuotationsListTool::KEYS],
      "users"                  => [User,                 UsersListTool::KEYS],
      "notification_alerts"    => [NotificationAlert,    NotificationAlertsListTool::KEYS],
      "parameterizations"      => [Parameterization,     ParameterizationsListTool::KEYS],
      "rols"                   => [Rol,                  RolsListTool::KEYS],
      "report_expense_options" => [ReportExpenseOption,  ReportExpenseOptionsListTool::KEYS]
    }
  end

  def self.call(entity:, server_context:, filters: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    entry = registry[entity.to_s]
    return not_found!("entity #{entity}") unless entry

    model, serializer = entry
    limit = [[limit.to_i, 1].max, 200].min
    scope = Mcp::Query.apply(model, model.all, filters: filters, q: q).order(id: :desc).limit(limit)

    data = scope.map do |rec|
      serializer.respond_to?(:call) ? serializer.call(rec) : Mcp::Serialize.record(rec, serializer)
    end
    json(data)
  end
end
