module CostCentersHelper
	def color_value(cotizado, real)

	end

	def get_cost_centers_items(cost_centers)
		cost_centers.collect do |cost_center|
			get_cost_centers_item(cost_center)
		end
	end

	def get_cost_centers_item(cost_center)
		{
			id: cost_center.id,
			code: cost_center.code,
			customer: cost_center.customer.present? ? { id: cost_center.customer.id, name: cost_center.customer.name } : nil,
			customer_id: cost_center.customer_id,
			contact: cost_center.contact.present? ? { id: cost_center.contact.id, name: cost_center.contact.name } : nil,
			contact_id: cost_center.contact_id,
			description: cost_center.description,
			service_type: cost_center.service_type,
			execution_state: cost_center.execution_state,
			invoiced_state: cost_center.invoiced_state,
			sales_state: cost_center.sales_state,
			start_date: cost_center.start_date,
			end_date: cost_center.end_date,
			quotation_number: cost_center.quotation_number,
			quotation_value: cost_center.quotation_value,
			eng_hours: cost_center.eng_hours,
			hour_cotizada: cost_center.hour_cotizada,
			hour_real: cost_center.hour_real,
			engineering_value: cost_center.engineering_value,
			hours_contractor: cost_center.hours_contractor,
			hours_contractor_invoices: cost_center.hours_contractor_invoices,
			hours_contractor_real: cost_center.hours_contractor_real,
			displacement_hours: cost_center.displacement_hours,
			value_displacement_hours: cost_center.value_displacement_hours,
			materials_value: cost_center.materials_value,
			viatic_value: cost_center.viatic_value,
			work_force_contractor: cost_center.work_force_contractor,
			has_many_quotes: cost_center.has_many_quotes,
			user: cost_center.user.present? ? { id: cost_center.user.id, names: cost_center.user.names } : nil,
			user_id: cost_center.user_id,
			user_owner: cost_center.user_owner.present? ? { id: cost_center.user_owner.id, name: cost_center.user_owner.names } : nil,
			last_user_edited: cost_center.last_user_edited.present? ? { id: cost_center.last_user_edited.id, names: cost_center.last_user_edited.names } : nil,
			created_at: cost_center.created_at,
			updated_at: cost_center.updated_at,
			# Indicator fields needed by the table
			ing_horas_eje: cost_center.ing_horas_eje,
			ing_horas_porcentaje: cost_center.ing_horas_porcentaje,
			ing_costo_real: cost_center.ing_costo_real,
			ing_costo_porcentaje: cost_center.ing_costo_porcentaje,
			cont_horas_eje: cost_center.cont_horas_eje,
			cont_horas_porcentaje: cost_center.cont_horas_porcentaje,
			cont_costo_real: cost_center.cont_costo_real,
			cont_costo_porcentaje: cost_center.cont_costo_porcentaje,
			desp_horas_eje: cost_center.desp_horas_eje,
			desp_horas_porcentaje: cost_center.desp_horas_porcentaje,
			mat_costo_real: cost_center.mat_costo_real,
			mat_costo_porcentaje: cost_center.mat_costo_porcentaje,
			viat_costo_real: cost_center.viat_costo_real,
			viat_costo_porcentaje: cost_center.viat_costo_porcentaje,
			fact_real: cost_center.fact_real,
			fact_porcentaje: cost_center.fact_porcentaje,
			aiu: cost_center.aiu,
			aiu_percent: cost_center.aiu_percent,
			aiu_real: cost_center.aiu_real,
			aiu_percent_real: cost_center.aiu_percent_real,
			sales_orders_total: cost_center.sales_orders.sum { |so| so.order_value || 0 },
		}
	end
end
