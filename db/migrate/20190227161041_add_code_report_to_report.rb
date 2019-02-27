class AddCodeReportToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :code_report, :string
  end
end
