namespace :update_cost_center do
  desc "Sends the most voted products created yesterday"
  task create: :environment do
    CostCenter.all.each do |cost_center|
      @cost_center = cost_center
      ing_horas_eje = @cost_center.reports.sum(:working_time)
      ing_horas_porcentaje = @cost_center.eng_hours > 0 ? (((ing_horas_eje.to_f / @cost_center.eng_hours)) * 100).to_i : 0

      #desplazamiento
      cotizado_desplazamiento = @cost_center.value_displacement_hours * @cost_center.displacement_hours
      ejecutado_desplazamiento = @cost_center.reports.sum(:value_displacement_hours)
      desp_horas_eje = @cost_center.reports.sum(:displacement_hours)
      desp_horas_porcentaje = @cost_center.displacement_hours > 0 ? (((desp_horas_eje.to_f / @cost_center.displacement_hours)) * 100).to_i : "N/A"

      #ingenieria costos
      ing_costo_cotizado = (@cost_center.hour_cotizada * @cost_center.eng_hours).to_i + cotizado_desplazamiento
      ing_costo_real = (@cost_center.hour_real * ing_horas_eje).to_i + ejecutado_desplazamiento
      ing_costo_porcentaje = ing_costo_cotizado > 0 ? (((1 - (ing_costo_real.to_f / ing_costo_cotizado)) * 100)).to_i : 0

      #contractor
      cont_horas_eje = @cost_center.contractors.sum(:hours)
      cont_horas_porcentaje = @cost_center.hours_contractor > 0 ? (((cont_horas_eje.to_f / @cost_center.hours_contractor)) * 100).to_i : 0
      cont_costo_cotizado = (@cost_center.hours_contractor_invoices * @cost_center.hours_contractor).to_i
      cont_costo_real = (@cost_center.hours_contractor_real * cont_horas_eje).to_i
      cont_costo_porcentaje = cont_costo_cotizado > 0 ? (((1 - (cont_costo_real.to_f / cont_costo_cotizado)) * 100)).to_i : 0

      mat_costo_real = @cost_center.materials.sum(:amount)
      mat_costo_porcentaje = (@cost_center.materials_value != nil ? @cost_center.materials_value : 0) > 0 ? ((1 - (mat_costo_real.to_f / @cost_center.materials_value)) * 100).to_i : 0

      viat_costo_real = @cost_center.reports.sum(:viatic_value)
      viat_costo_porcentaje = @cost_center.viatic_value > 0 ? ((viat_costo_real.to_f / @cost_center.viatic_value) * 100).to_i : 0

      fact_real = @cost_center.customer_invoices.sum(:invoice_value)
      fact_porcentaje = @cost_center.quotation_value > 0 ? ((fact_real.to_f / @cost_center.quotation_value) * 100).to_i : 0

      @cost_center.update(
        ing_horas_eje: ing_horas_eje,
        ing_horas_porcentaje: ing_horas_porcentaje,
        desp_horas_eje: desp_horas_eje,
        desp_horas_porcentaje: desp_horas_porcentaje,
        ing_costo_cotizado: ing_costo_cotizado,
        ing_costo_real: ing_costo_real,
        ing_costo_porcentaje: ing_costo_porcentaje,
        cont_horas_eje: cont_horas_eje,
        cont_horas_porcentaje: cont_horas_porcentaje,
        cont_costo_cotizado: cont_costo_cotizado,
        cont_costo_real: cont_costo_real,
        cont_costo_porcentaje: cont_costo_porcentaje,
        mat_costo_real: mat_costo_real,
        mat_costo_porcentaje: mat_costo_porcentaje,
        viat_costo_real: viat_costo_real,
        viat_costo_porcentaje: viat_costo_porcentaje,
        fact_real: fact_real,
        fact_porcentaje: fact_porcentaje,

      )
    end
  end
end
