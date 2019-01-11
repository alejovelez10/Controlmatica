class AddReportCodeToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :report_code, :string
  end
end
