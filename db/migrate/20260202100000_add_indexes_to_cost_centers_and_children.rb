class AddIndexesToCostCentersAndChildren < ActiveRecord::Migration[5.2]
  def change
    add_index :cost_centers, :customer_id unless index_exists?(:cost_centers, :customer_id)
    add_index :cost_centers, :user_id unless index_exists?(:cost_centers, :user_id)
    add_index :cost_centers, :execution_state unless index_exists?(:cost_centers, :execution_state)
    add_index :cost_centers, :invoiced_state unless index_exists?(:cost_centers, :invoiced_state)
    add_index :cost_centers, :service_type unless index_exists?(:cost_centers, :service_type)
    add_index :cost_centers, :start_date unless index_exists?(:cost_centers, :start_date)
    add_index :cost_centers, :created_at unless index_exists?(:cost_centers, :created_at)
    add_index :cost_centers, :contact_id unless index_exists?(:cost_centers, :contact_id)
    add_index :cost_centers, :user_owner_id unless index_exists?(:cost_centers, :user_owner_id)
    add_index :cost_centers, :last_user_edited_id unless index_exists?(:cost_centers, :last_user_edited_id)

    add_index :reports, :cost_center_id unless index_exists?(:reports, :cost_center_id)
    add_index :customer_invoices, :cost_center_id unless index_exists?(:customer_invoices, :cost_center_id)
    add_index :sales_orders, :cost_center_id unless index_exists?(:sales_orders, :cost_center_id)
    add_index :materials, :cost_center_id unless index_exists?(:materials, :cost_center_id)
    add_index :contractors, :cost_center_id unless index_exists?(:contractors, :cost_center_id)
    add_index :shifts, :cost_center_id unless index_exists?(:shifts, :cost_center_id)
    add_index :report_expenses, :cost_center_id unless index_exists?(:report_expenses, :cost_center_id)
    add_index :commissions, :cost_center_id unless index_exists?(:commissions, :cost_center_id)
    add_index :quotations, :cost_center_id unless index_exists?(:quotations, :cost_center_id)
    add_index :customer_reports, :cost_center_id unless index_exists?(:customer_reports, :cost_center_id)
    add_index :notification_alerts, :cost_center_id unless index_exists?(:notification_alerts, :cost_center_id)
  end
end
