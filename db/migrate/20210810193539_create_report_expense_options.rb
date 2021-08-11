class CreateReportExpenseOptions < ActiveRecord::Migration[5.2]
  def change
    create_table :report_expense_options do |t|
      t.string :name
      t.string :category
      t.integer :user_id

      t.timestamps
    end

    add_column :report_expenses, :type_identification_id, :integer
    add_column :report_expenses, :payment_type_id, :integer
    add_column :report_expenses, :identification, :string 
  end
end
