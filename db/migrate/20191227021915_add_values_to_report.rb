class AddValuesToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :displacement_hours, :float
    add_column :reports, :value_displacement_hours, :float
  end
end
