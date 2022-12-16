class AddSubjectToShift < ActiveRecord::Migration[6.1]
  def change
    add_column :shifts, :subject, :string
    add_column :shifts, :description, :text
  end
end
