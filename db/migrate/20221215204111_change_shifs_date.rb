class ChangeShifsDate < ActiveRecord::Migration[6.1]
  def change
    change_table :shifts do |t|
      t.change :start_date, :datetime
      t.change :end_date, :datetime
    end
  end
end
