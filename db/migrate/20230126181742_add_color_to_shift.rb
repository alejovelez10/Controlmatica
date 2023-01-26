class AddColorToShift < ActiveRecord::Migration[6.1]
  def change
    add_column :shifts, :color, :string, :default => "#1aa9fb"
    add_column :shifts, :force_save, :boolean, :default => false
  end
end
