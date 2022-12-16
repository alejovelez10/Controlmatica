class CreateJoinTableShiftsUsers < ActiveRecord::Migration[6.1]
  def change
    create_join_table :shifts, :users do |t|
      # t.index [:shift_id, :user_id]
      # t.index [:user_id, :shift_id]
    end
  end
end
