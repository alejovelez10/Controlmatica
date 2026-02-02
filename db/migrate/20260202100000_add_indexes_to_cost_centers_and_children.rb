class AddIndexesToCostCentersAndChildren < ActiveRecord::Migration[5.2]
  def change
    # cost_centers indexes
    add_index :cost_centers, :customer_id, if_not_exists: true
    add_index :cost_centers, :user_id, if_not_exists: true
    add_index :cost_centers, :execution_state
    add_index :cost_centers, :invoiced_state
    add_index :cost_centers, :service_type
    add_index :cost_centers, :start_date
    add_index :cost_centers, :created_at
    add_index :cost_centers, :contact_id, if_not_exists: true
    add_index :cost_centers, :user_owner_id
    add_index :cost_centers, :last_user_edited_id

    # Child tables - cost_center_id foreign key indexes
    add_index :reports, :cost_center_id, if_not_exists: true
    add_index :customer_invoices, :cost_center_id, if_not_exists: true
    add_index :sales_orders, :cost_center_id, if_not_exists: true
    add_index :materials, :cost_center_id, if_not_exists: true
    add_index :contractors, :cost_center_id, if_not_exists: true
    add_index :shifts, :cost_center_id, if_not_exists: true
    add_index :report_expenses, :cost_center_id, if_not_exists: true
    add_index :commissions, :cost_center_id, if_not_exists: true
    add_index :quotations, :cost_center_id, if_not_exists: true
    add_index :customer_reports, :cost_center_id, if_not_exists: true
    add_index :notification_alerts, :cost_center_id, if_not_exists: true
  end
end
