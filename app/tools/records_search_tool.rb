# frozen_string_literal: true

# Búsqueda genérica y potente sobre cualquier módulo, filtrando por CUALQUIER campo,
# con operadores, ordenamiento, paginación, selección de campos y modo conteo.
class RecordsSearchTool < ApplicationTool
  tool_name "records_search"
  description <<~DESC
    Búsqueda potente de registros en cualquier módulo. Parámetros:
    - entity: el módulo (ver enum).
    - filters: objeto campo:condición. La condición puede ser un valor simple (texto = LIKE
      parcial; id/número/fecha/booleano = exacto), un array (IN), o un objeto de operadores:
      eq, ne/not, gt, gte, lt, lte, like, starts_with, ends_with, in, nin, null (bool),
      between [a,b]. Ej: {"invoice_value":{"gte":100000},"invoice_date":{"between":["2026-01-01","2026-06-30"]}}.
    - q: texto libre; busca en TODAS las columnas de texto de la entidad.
    - sort: campo(s) de orden. "campo" asc, "-campo" desc, o lista "-created_at,name".
    - limit (default 50, máx 500) y offset para paginar.
    - count_only: si true, devuelve solo {count: N} (no trae registros).
    - fields: array de columnas a devolver (por defecto un set representativo por entidad).
    Ej: entity="cost_centers", filters={"code":"CC-0099"}; entity="customer_invoices",
    filters={"invoice_value":{"gte":1000000}}, sort="-invoice_value".
  DESC
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
      filters:    { type: "object", description: "Campo:condición (valor, array=IN, u objeto de operadores)" },
      q:          { type: "string", description: "Texto libre sobre todas las columnas de texto" },
      sort:       { type: "string", description: "Orden: \"campo\", \"-campo\" (desc), o lista separada por comas" },
      limit:      { type: "integer", description: "Máximo de resultados (default 50, máx 500)" },
      offset:     { type: "integer", description: "Desplazamiento para paginación (default 0)" },
      count_only: { type: "boolean", description: "Si true, devuelve solo {count: N}" },
      fields:     { type: "array", items: { type: "string" }, description: "Columnas a devolver (opcional)" }
    },
    required: ["entity"]
  )

  # entity => modelo + serializador por defecto (reutiliza las KEYS de cada *_list tool).
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

  def self.call(entity:, server_context:, filters: nil, q: nil, sort: nil,
                limit: 50, offset: 0, count_only: false, fields: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    entry = registry[entity.to_s]
    return not_found!("entity #{entity}") unless entry

    model, serializer = entry
    scope = Mcp::Query.apply(model, model.all, filters: filters, q: q)

    return json({ count: scope.count }) if count_only

    limit = [[limit.to_i, 1].max, 500].min
    offset = [offset.to_i, 0].max
    scope = Mcp::Query.order(model, scope, sort || "-id").limit(limit).offset(offset)

    data =
      if fields.is_a?(Array) && fields.any?
        allowed = fields.map(&:to_s) & model.column_names
        scope.map { |rec| allowed.each_with_object({}) { |c, h| h[c] = rec[c] } }
      elsif serializer.respond_to?(:call)
        scope.map { |rec| serializer.call(rec) }
      else
        scope.map { |rec| Mcp::Serialize.record(rec, serializer) }
      end

    json(data)
  end
end
