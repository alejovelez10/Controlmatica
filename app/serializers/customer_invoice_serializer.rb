class CustomerInvoiceSerializer < ActiveModel::Serializer
  attributes :id, :cost_center_id, :sales_order_id, :invoice_value, :invoice_date, :delivery_certificate_file, :delivery_certificate_state, :reception_report_file, :reception_report_state, :invoice_state
end
