namespace :calculate_aiu do
  desc "Sends the most voted products created yesterday"
  task create: :environment do
    CostCenter.all.each do |cost|
      gastos = cost.ing_costo_real + cost.cont_costo_real + cost.mat_costo_real + cost.viat_costo_real
      aiu = cost.fact_real - gastos
      aiu_percent = cost.fact_real > 0 ? ((aiu.to_f / cost.fact_real.to_f) * 100).to_i : 0

      aiu_real = cost.quotation_value - gastos
      aiu_percent_real = cost.quotation_value > 0 ? ((gastos.to_f / cost.quotation_value.to_f) * 100).to_i : 0

      cost.update(aiu: aiu, aiu_percent: aiu_percent, aiu_real: aiu_percent_real, total_expenses: gastos)
    end
  end
end
