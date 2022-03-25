module CostCentersHelper
	def color_value(cotizado, real)

	end

	def get_cost_centers_items(cost_centers)
		cost_centers.collect do |cost_center|
			{
				:id => cost_center.id,
				:aiu_percent => cost_center.aiu_percent,
				:aiu_percent_real => cost_center.aiu_percent_real,
				:aiu_real => cost_center.aiu_real,
				:code => cost_center.code,
				:cont_costo_cotizado => cost_center.cont_costo_cotizado,
				:cont_costo_porcentaje => cost_center.cont_costo_porcentaje,
				:cont_costo_real => cost_center.cont_costo_real,
				:cont_horas_eje => cost_center.cont_horas_eje,
				:cont_horas_porcentaje => cost_center.cont_horas_porcentaje,
				:contact => cost_center.contact.present? ? { id: cost_center.contact.id, name: cost_center.contact.name } : nil,
				:contact_id => cost_center.contact_id,
				:contractor_total_costo => cost_center.contractor_total_costo,
				:count => cost_center.count,
				:create_type => cost_center.create_type,
				:created_at => cost_center.created_at,
				:customer => cost_center.customer.present? ? { id: cost_center.customer.id, name: cost_center.customer.name } : nil,
				:customer_id => cost_center.customer_id,
				:description => cost_center.description,
				:desp_horas_eje => cost_center.desp_horas_eje,
				:desp_horas_porcentaje => cost_center.desp_horas_porcentaje,
				:displacement_hours => cost_center.displacement_hours,
				:end_date => cost_center.end_date,
				:eng_hours => cost_center.eng_hours,
				:engineering_value => cost_center.engineering_value,
				:execution_state => cost_center.execution_state,
				:fact_porcentaje => cost_center.fact_porcentaje,
				:fact_real => cost_center.fact_real,
				:hour_cotizada => cost_center.hour_cotizada,
				:hour_real => cost_center.hour_real,
				:hours_contractor => cost_center.hours_contractor,
				:hours_contractor_invoices => cost_center.hours_contractor_invoices,
				:hours_contractor_real => cost_center.hours_contractor_real,
				:ing_costo_cotizado => cost_center.ing_costo_cotizado,
				:ing_costo_porcentaje => cost_center.ing_costo_porcentaje,
				:ing_costo_real => cost_center.ing_costo_real,
				:ing_horas_eje => cost_center.ing_horas_eje,
				:ing_horas_porcentaje => cost_center.ing_horas_porcentaje,
				:ingenieria_total_costo => cost_center.ingenieria_total_costo,
				:invoiced_state => cost_center.invoiced_state,
				:last_user_edited => cost_center.last_user_edited.present? ? { id: cost_center.last_user_edited.id, name: cost_center.last_user_edited.names } : nil,
				:last_user_edited_id => cost_center.last_user_edited_id,
				:mat_costo_porcentaje => cost_center.mat_costo_porcentaje,
				:mat_costo_real => cost_center.mat_costo_real,
				:materials_value => cost_center.materials_value,
				:offset_value => cost_center.offset_value,
				:quotation_number => cost_center.quotation_number,
				:quotation_value => cost_center.quotation_value,
				:sales_orders => cost_center.sales_orders,
				:sales_state => cost_center.sales_state,
				:service_type => cost_center.service_type,
				:start_date => cost_center.start_date,
				:sum_contractor_costo => cost_center.sum_contractor_costo,
				:sum_contractor_cot => cost_center.sum_contractor_cot,
				:sum_contractors => cost_center.sum_contractors,
				:sum_executed => cost_center.sum_executed,
				:sum_materials => cost_center.sum_materials,
				:sum_materials_costo => cost_center.sum_materials_costo,
				:sum_materials_cot => cost_center.sum_materials_cot,
				:sum_materials_value => cost_center.sum_materials_value,
				
				:sum_viatic => cost_center.sum_viatic,
				:total_expenses => cost_center.total_expenses,
				:update_user => cost_center.update_user,
				:updated_at => cost_center.updated_at,
				:user => cost_center.user.present? ? { id: cost_center.user.id, name: cost_center.user.names } : nil,
				:user_id => cost_center.user_id,
				:user_owner => cost_center.user_owner.present? ? { id: cost_center.user_owner.id, name: cost_center.user_owner.names } : nil,
				:value_displacement_hours => cost_center.value_displacement_hours,
				
				:viat_costo_porcentaje => cost_center.viat_costo_porcentaje,
				:viat_costo_real => cost_center.viat_costo_real,
				:viatic_value => cost_center.viatic_value,
				:work_force_contractor => cost_center.work_force_contractor,
			}
		end
	end


	def get_cost_centers_item(cost_center)
		{
			:id => cost_center.id,
			:aiu_percent => cost_center.aiu_percent,
			:aiu_percent_real => cost_center.aiu_percent_real,
			:aiu_real => cost_center.aiu_real,
			:code => cost_center.code,
			:cont_costo_cotizado => cost_center.cont_costo_cotizado,
			:cont_costo_porcentaje => cost_center.cont_costo_porcentaje,
			:cont_costo_real => cost_center.cont_costo_real,
			:cont_horas_eje => cost_center.cont_horas_eje,
			:cont_horas_porcentaje => cost_center.cont_horas_porcentaje,
			:contact => cost_center.contact.present? ? { id: cost_center.contact.id, name: cost_center.contact.name } : nil,
			:contact_id => cost_center.contact_id,
			:contractor_total_costo => cost_center.contractor_total_costo,
			:count => cost_center.count,
			:create_type => cost_center.create_type,
			:created_at => cost_center.created_at,
			:customer => cost_center.customer.present? ? { id: cost_center.customer.id, name: cost_center.customer.name } : nil,
			:customer_id => cost_center.customer_id,
			:description => cost_center.description,
			:desp_horas_eje => cost_center.desp_horas_eje,
			:desp_horas_porcentaje => cost_center.desp_horas_porcentaje,
			:displacement_hours => cost_center.displacement_hours,
			:end_date => cost_center.end_date,
			:eng_hours => cost_center.eng_hours,
			:engineering_value => cost_center.engineering_value,
			:execution_state => cost_center.execution_state,
			:fact_porcentaje => cost_center.fact_porcentaje,
			:fact_real => cost_center.fact_real,
			:hour_cotizada => cost_center.hour_cotizada,
			:hour_real => cost_center.hour_real,
			:hours_contractor => cost_center.hours_contractor,
			:hours_contractor_invoices => cost_center.hours_contractor_invoices,
			:hours_contractor_real => cost_center.hours_contractor_real,
			:ing_costo_cotizado => cost_center.ing_costo_cotizado,
			:ing_costo_porcentaje => cost_center.ing_costo_porcentaje,
			:ing_costo_real => cost_center.ing_costo_real,
			:ing_horas_eje => cost_center.ing_horas_eje,
			:ing_horas_porcentaje => cost_center.ing_horas_porcentaje,
			:ingenieria_total_costo => cost_center.ingenieria_total_costo,
			:invoiced_state => cost_center.invoiced_state,
			:last_user_edited => cost_center.last_user_edited.present? ? { id: cost_center.last_user_edited.id, name: cost_center.last_user_edited.names } : nil,
			:last_user_edited_id => cost_center.last_user_edited_id,
			:mat_costo_porcentaje => cost_center.mat_costo_porcentaje,
			:mat_costo_real => cost_center.mat_costo_real,
			:materials_value => cost_center.materials_value,
			:offset_value => cost_center.offset_value,
			:quotation_number => cost_center.quotation_number,
			:quotation_value => cost_center.quotation_value,
			:sales_orders => cost_center.sales_orders,
			:sales_state => cost_center.sales_state,
			:service_type => cost_center.service_type,
			:start_date => cost_center.start_date,
			:sum_contractor_costo => cost_center.sum_contractor_costo,
			:sum_contractor_cot => cost_center.sum_contractor_cot,
			:sum_contractors => cost_center.sum_contractors,
			:sum_executed => cost_center.sum_executed,
			:sum_materials => cost_center.sum_materials,
			:sum_materials_costo => cost_center.sum_materials_costo,
			:sum_materials_cot => cost_center.sum_materials_cot,
			:sum_materials_value => cost_center.sum_materials_value,
			
			:sum_viatic => cost_center.sum_viatic,
			:total_expenses => cost_center.total_expenses,
			:update_user => cost_center.update_user,
			:updated_at => cost_center.updated_at,
			:user => cost_center.user.present? ? { id: cost_center.user.id, name: cost_center.user.names } : nil,
			:user_id => cost_center.user_id,
			:user_owner => cost_center.user_owner.present? ? { id: cost_center.user_owner.id, name: cost_center.user_owner.names } : nil,
			:value_displacement_hours => cost_center.value_displacement_hours,
			
			:viat_costo_porcentaje => cost_center.viat_costo_porcentaje,
			:viat_costo_real => cost_center.viat_costo_real,
			:viatic_value => cost_center.viatic_value,
			:work_force_contractor => cost_center.work_force_contractor,
		}
	end
end
