# frozen_string_literal: true

# Actualiza campos de un centro de costo. Solo aplica los campos provistos.
class CostCentersUpdateTool < ApplicationTool
  tool_name "cost_centers_update"
  description "Actualiza un centro de costo por ID. Solo modifica los campos enviados. " \
              "Devuelve el registro actualizado o los errores de validación."
  input_schema(
    properties: {
      id:               { type: "integer", description: "ID del centro de costo (requerido)" },
      description:      { type: "string",  description: "Descripción" },
      customer_id:      { type: "integer", description: "ID del cliente" },
      contact_id:       { type: "integer", description: "ID del contacto" },
      service_type:     { type: "string",  description: "PROYECTO o SERVICIO" },
      quotation_number: { type: "string",  description: "Número de cotización" },
      start_date:       { type: "string",  description: "Fecha inicio YYYY-MM-DD" },
      end_date:         { type: "string",  description: "Fecha fin YYYY-MM-DD" },
      eng_hours:        { type: "number",  description: "Horas de ingeniería" },
      hour_real:        { type: "number",  description: "Valor hora costo" },
      hour_cotizada:    { type: "number",  description: "Valor hora cotizada" },
      materials_value:  { type: "number",  description: "Valor de materiales" },
      viatic_value:     { type: "number",  description: "Valor viáticos" }
    },
    required: ["id"]
  )

  ASSIGNABLE = %i[description customer_id contact_id service_type quotation_number
                  start_date end_date eng_hours hour_real hour_cotizada
                  materials_value viatic_value].freeze

  def self.call(id:, server_context:, **args)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    cc = CostCenter.find_by(id: id)
    return not_found!("cost_center #{id}") unless cc

    attrs = args.slice(*ASSIGNABLE)
    return json(Mcp::CostCenterSerializer.full(cc)) if attrs.empty?

    as_actor(tenant) do
      if cc.update(attrs)
        json(Mcp::CostCenterSerializer.full(cc))
      else
        text("Error: #{cc.errors.full_messages.join(', ')}")
      end
    end
  end
end
