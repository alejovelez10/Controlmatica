# frozen_string_literal: true

# Agregaciones genéricas sobre cualquier módulo: count/sum/avg/min/max, con filtros
# (mismos operadores que records_search) y group_by opcional. Ideal para reportes:
# total facturado por cliente, suma de materiales por centro de costo, conteo por estado, etc.
class RecordsAggregateTool < ApplicationTool
  tool_name "records_aggregate"
  description <<~DESC
    Calcula agregados sobre cualquier módulo. Parámetros:
    - entity: el módulo (mismos que records_search).
    - metric: count | sum | avg | min | max.
    - field: columna numérica sobre la que se calcula (requerida salvo en count).
    - group_by: columna por la que agrupar (opcional). Si se da, devuelve un array
      [{group: <valor>, value: <agregado>}, ...] ordenado desc por valor.
    - filters / q: mismos filtros y operadores que records_search.
    - limit: máximo de grupos a devolver (default 100).
    Ej: entity="customer_invoices", metric="sum", field="invoice_value", group_by="cost_center_id".
    Ej: entity="cost_centers", metric="count", group_by="execution_state".
  DESC
  input_schema(
    properties: {
      entity:   { type: "string", description: "Módulo (ver records_search)" },
      metric:   { type: "string", description: "count | sum | avg | min | max", enum: %w[count sum avg min max] },
      field:    { type: "string", description: "Columna numérica a agregar (requerida salvo en count)" },
      group_by: { type: "string", description: "Columna por la que agrupar (opcional)" },
      filters:  { type: "object", description: "Filtros (mismos operadores que records_search)" },
      q:        { type: "string", description: "Texto libre" },
      limit:    { type: "integer", description: "Máximo de grupos (default 100, máx 500)" }
    },
    required: %w[entity metric]
  )

  def self.call(entity:, metric:, server_context:, field: nil, group_by: nil, filters: nil, q: nil, limit: 100)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    entry = RecordsSearchTool.registry[entity.to_s]
    return not_found!("entity #{entity}") unless entry

    model = entry.first
    metric = metric.to_s
    return text("Error: metric inválida (usa count/sum/avg/min/max)") unless %w[count sum avg min max].include?(metric)

    if metric != "count"
      return text("Error: 'field' es requerido para metric=#{metric}") if field.to_s.empty?
      return not_found!("campo #{field}") unless model.column_names.include?(field.to_s)
    end
    if group_by && !model.column_names.include?(group_by.to_s)
      return not_found!("campo group_by #{group_by}")
    end

    scope = Mcp::Query.apply(model, model.all, filters: filters, q: q)
    limit = [[limit.to_i, 1].max, 500].min

    if group_by
      grouped = scope.group(group_by.to_s).public_send(metric, *(metric == "count" ? [] : [field.to_s]))
      rows = grouped.map { |g, v| { group: g, value: numeric(v) } }
      rows.sort_by! { |r| -(r[:value] || 0).to_f }
      json({ entity: entity, metric: metric, field: field, group_by: group_by, groups: rows.first(limit) })
    else
      value = scope.public_send(metric, *(metric == "count" ? [] : [field.to_s]))
      json({ entity: entity, metric: metric, field: field, value: numeric(value) })
    end
  end

  def self.numeric(v)
    return v if v.nil? || v.is_a?(Integer)

    f = v.to_f
    (f % 1).zero? ? f.to_i : f.round(2)
  end
end
