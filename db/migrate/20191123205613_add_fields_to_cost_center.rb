class AddFieldsToCostCenter < ActiveRecord::Migration[5.2]
  def change
    add_column :cost_centers, :work_force_contractor, :float
    add_column :cost_centers, :hours_contractor, :integer
    add_column :cost_centers, :hours_contractor_invoices, :float
    add_column :cost_centers, :hours_contractor_real, :float
    add_column :cost_centers, :materials_value, :float
  end
end
