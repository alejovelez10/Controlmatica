module SalesOrdersHelper
    def get_sales_orders_items(sales_orders)
		sales_orders.collect do |sales_order|
			{
                :id => sales_order.id,
                :cost_center => { 
                    id: sales_order.cost_center.id, 
                    code: sales_order.cost_center.code, 
                    invoiced_state: sales_order.cost_center.invoiced_state, 
                    quotation_number: sales_order.cost_center.quotation_number, 
                    customer: sales_order.cost_center.customer,
                },
                :created_date => sales_order.created_date,
                :cost_center_id => sales_order.cost_center_id,
                :created_at => sales_order.created_at,
                :customer_invoices => get_customer_invoices(sales_order.customer_invoices),
                :description => sales_order.description,
                :last_user_edited => sales_order.last_user_edited.present? ? { id: sales_order.last_user_edited.id, name: sales_order.last_user_edited.names } : nil,
                :last_user_edited_id => sales_order.last_user_edited_id,
                :total_engineering_values => sales_order.customer_invoices.sum(:engineering_value),
                :order_file => sales_order.order_file,
                :order_number => sales_order.order_number,
                :order_value => sales_order.order_value,
                :state => sales_order.state,
                :sum_invoices => sales_order.sum_invoices,
                :update_user => sales_order.update_user,
                :updated_at => sales_order.updated_at,
                :user => sales_order.user.present? ? { id: sales_order.user.id, name: sales_order.user.names } : nil,
                :user_id => sales_order.user_id,
			}
		end
	end

	def get_sales_orders_item(sales_order)
        {
            :id => sales_order.id,
            :cost_center => { 
                id: sales_order.cost_center.id, 
                code: sales_order.cost_center.code, 
                invoiced_state: sales_order.cost_center.invoiced_state, 
                quotation_number: sales_order.cost_center.quotation_number, 
                customer: sales_order.cost_center.customer,
            },
            :created_date => sales_order.created_date,
            :cost_center_id => sales_order.cost_center_id,
            :created_at => sales_order.created_at,
            :customer_invoices => get_customer_invoices(sales_order.customer_invoices),
            :description => sales_order.description,
            :last_user_edited => sales_order.last_user_edited.present? ? { id: sales_order.last_user_edited.id, name: sales_order.last_user_edited.names } : nil,
            :last_user_edited_id => sales_order.last_user_edited_id,
            :total_engineering_values => sales_order.customer_invoices.sum(:engineering_value),
            :order_file => sales_order.order_file,
            :order_number => sales_order.order_number,
            :order_value => sales_order.order_value,
            :state => sales_order.state,
            :sum_invoices => sales_order.sum_invoices,
            :update_user => sales_order.update_user,
            :updated_at => sales_order.updated_at,
            :user => sales_order.user.present? ? { id: sales_order.user.id, name: sales_order.user.names } : nil,
            :user_id => sales_order.user_id,
        }
	end

    def get_customer_invoices(customer_invoices)
        customer_invoices.collect do |customer_invoice|
			{
                :id => customer_invoice.id,
                :invoice_date => customer_invoice.invoice_date,
                :invoice_value => customer_invoice.invoice_value,
                :number_invoice => customer_invoice.number_invoice,
			}
		end
    end
end
