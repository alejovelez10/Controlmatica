class AddMicrosoftIdToShift < ActiveRecord::Migration[6.1]
  def change
    add_column :shifts, :microsoft_id, :string
  end
end
