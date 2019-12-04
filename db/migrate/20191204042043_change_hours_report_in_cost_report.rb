class ChangeHoursReportInCostReport < ActiveRecord::Migration[5.2]
  def change
    change_column :reports, :working_time, :float
    change_column :contractors, :hours, :float
  end
end
