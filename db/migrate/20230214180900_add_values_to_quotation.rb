class AddValuesToQuotation < ActiveRecord::Migration[6.1]
  def change
    add_column :quotations, :ingenieria_total_costo, :float
    add_column :quotations, :engineering_value, :float
    add_column :quotations, :contractor_total_costo, :float
    add_column :quotations, :work_force_contractor, :float
    add_column :quotations, :offset_value, :float
  end
end
