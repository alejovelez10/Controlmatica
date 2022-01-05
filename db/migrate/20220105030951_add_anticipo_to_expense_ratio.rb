class AddAnticipoToExpenseRatio < ActiveRecord::Migration[5.2]
  def change
    add_column :expense_ratios, :anticipo, :float
  end
end
