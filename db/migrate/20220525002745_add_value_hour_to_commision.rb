class AddValueHourToCommision < ActiveRecord::Migration[5.2]
  def change
    add_column :commissions, :value_hour, :float
  end
end
