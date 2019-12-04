class ChangeHoursContractorTypeInCostCenter < ActiveRecord::Migration[5.2]
  def change
    change_column :cost_centers, :hours_contractor, :float
  end
end
