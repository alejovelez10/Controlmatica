class AddStateReportToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :report_sate, :boolean
  end
end
