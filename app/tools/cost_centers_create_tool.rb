# frozen_string_literal: true

# Crea un centro de costo. Los callbacks del modelo autogeneran `code`, crean la
# cotización inicial y estampan registros de auditoría (que dependen de User.current),
# por eso la escritura se envuelve en `as_actor`.
class CostCentersCreateTool < ApplicationTool
  tool_name "cost_centers_create"
  description "Crea un centro de costo (proyecto/servicio). Requiere customer_id, description y " \
              "service_type. Los campos numéricos son opcionales (default 0). Devuelve el registro creado " \
              "o los errores de validación. Usa customers_list para obtener customer_id válidos."
  input_schema(
    properties: {
      customer_id:               { type: "integer", description: "ID del cliente (requerido)" },
      description:               { type: "string",  description: "Descripción del proyecto/servicio" },
      service_type:              { type: "string",  description: "PROYECTO o SERVICIO" },
      contact_id:                { type: "integer", description: "ID del contacto (opcional)" },
      quotation_number:          { type: "string",  description: "Número de cotización (opcional)" },
      start_date:                { type: "string",  description: "Fecha inicio YYYY-MM-DD (opcional)" },
      end_date:                  { type: "string",  description: "Fecha fin YYYY-MM-DD (opcional)" },
      eng_hours:                 { type: "number",  description: "Horas de ingeniería (default 0)" },
      hour_real:                 { type: "number",  description: "Valor hora costo (default 0)" },
      hour_cotizada:             { type: "number",  description: "Valor hora cotizada (default 0)" },
      hours_contractor:          { type: "number",  description: "Horas tablerista/contratista (default 0)" },
      hours_contractor_real:     { type: "number",  description: "Valor hora contratista costo (default 0)" },
      hours_contractor_invoices: { type: "number",  description: "Valor hora contratista cotizada (default 0)" },
      displacement_hours:        { type: "number",  description: "Horas de desplazamiento (default 0)" },
      materials_value:           { type: "number",  description: "Valor de materiales (default 0)" },
      viatic_value:              { type: "number",  description: "Valor viáticos (default 0)" }
    },
    required: %w[customer_id description service_type]
  )

  def self.call(customer_id:, description:, service_type:, server_context:,
                contact_id: nil, quotation_number: nil, start_date: nil, end_date: nil,
                eng_hours: 0, hour_real: 0, hour_cotizada: 0, hours_contractor: 0,
                hours_contractor_real: 0, hours_contractor_invoices: 0,
                displacement_hours: 0, materials_value: 0, viatic_value: 0)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant
    return not_found!("customer #{customer_id}") unless Customer.exists?(customer_id)

    as_actor(tenant) do |actor|
      cc = CostCenter.new(
        customer_id: customer_id, description: description, service_type: service_type,
        contact_id: contact_id, quotation_number: quotation_number,
        start_date: start_date, end_date: end_date,
        eng_hours: eng_hours.to_f, hour_real: hour_real.to_f, hour_cotizada: hour_cotizada.to_f,
        hours_contractor: hours_contractor.to_f, hours_contractor_real: hours_contractor_real.to_f,
        hours_contractor_invoices: hours_contractor_invoices.to_f,
        displacement_hours: displacement_hours.to_f, materials_value: materials_value.to_f,
        viatic_value: viatic_value.to_f
      )
      cc.user_id = actor&.id
      cc.user_owner_id = actor&.id if cc.respond_to?(:user_owner_id=)

      if cc.save
        json(Mcp::CostCenterSerializer.full(cc))
      else
        text("Error: #{cc.errors.full_messages.join(', ')}")
      end
    end
  end
end
