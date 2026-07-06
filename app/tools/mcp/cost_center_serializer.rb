# frozen_string_literal: true

module Mcp
  # Serializa CostCenter a hashes explícitos (nunca AR crudo) para respuestas MCP.
  # Namespaced bajo Mcp:: para no colisionar con app/serializers (active_model_serializers).
  class CostCenterSerializer
    # Vista resumida para listados.
    def self.summary(cc)
      {
        id: cc.id,
        code: cc.code,
        description: cc.description,
        service_type: cc.service_type,
        execution_state: cc.execution_state,
        invoiced_state: cc.invoiced_state,
        sales_state: cc.sales_state,
        customer_id: cc.customer_id,
        customer_name: cc.customer&.name,
        start_date: cc.start_date,
        end_date: cc.end_date,
        quotation_number: cc.quotation_number,
        quotation_value: cc.quotation_value,
        created_at: cc.created_at
      }
    end

    # Vista completa con métricas y conteos de relaciones (para _get).
    def self.full(cc)
      summary(cc).merge(
        contact_id: cc.contact_id,
        user_owner_id: cc.user_owner_id,
        eng_hours: cc.eng_hours,
        hour_real: cc.hour_real,
        hour_cotizada: cc.hour_cotizada,
        hours_contractor: cc.hours_contractor,
        materials_value: cc.materials_value,
        viatic_value: cc.viatic_value,
        total_expenses: cc.total_expenses,
        engineering_value: cc.engineering_value,
        counts: {
          reports: cc.reports.size,
          materials: cc.materials.size,
          contractors: cc.contractors.size,
          sales_orders: cc.sales_orders.size,
          customer_invoices: cc.customer_invoices.size,
          quotations: cc.quotations.size
        }
      )
    end
  end
end
