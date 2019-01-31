require 'test_helper'

class CustomerInvoicesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @customer_invoice = customer_invoices(:one)
  end

  test "should get index" do
    get customer_invoices_url
    assert_response :success
  end

  test "should get new" do
    get new_customer_invoice_url
    assert_response :success
  end

  test "should create customer_invoice" do
    assert_difference('CustomerInvoice.count') do
      post customer_invoices_url, params: { customer_invoice: { cost_center_id: @customer_invoice.cost_center_id, delivery_certificate_file: @customer_invoice.delivery_certificate_file, delivery_certificate_state: @customer_invoice.delivery_certificate_state, invoice_date: @customer_invoice.invoice_date, invoice_state: @customer_invoice.invoice_state, invoice_value: @customer_invoice.invoice_value, reception_report_file: @customer_invoice.reception_report_file, reception_report_state: @customer_invoice.reception_report_state, sales_order_id: @customer_invoice.sales_order_id } }
    end

    assert_redirected_to customer_invoice_url(CustomerInvoice.last)
  end

  test "should show customer_invoice" do
    get customer_invoice_url(@customer_invoice)
    assert_response :success
  end

  test "should get edit" do
    get edit_customer_invoice_url(@customer_invoice)
    assert_response :success
  end

  test "should update customer_invoice" do
    patch customer_invoice_url(@customer_invoice), params: { customer_invoice: { cost_center_id: @customer_invoice.cost_center_id, delivery_certificate_file: @customer_invoice.delivery_certificate_file, delivery_certificate_state: @customer_invoice.delivery_certificate_state, invoice_date: @customer_invoice.invoice_date, invoice_state: @customer_invoice.invoice_state, invoice_value: @customer_invoice.invoice_value, reception_report_file: @customer_invoice.reception_report_file, reception_report_state: @customer_invoice.reception_report_state, sales_order_id: @customer_invoice.sales_order_id } }
    assert_redirected_to customer_invoice_url(@customer_invoice)
  end

  test "should destroy customer_invoice" do
    assert_difference('CustomerInvoice.count', -1) do
      delete customer_invoice_url(@customer_invoice)
    end

    assert_redirected_to customer_invoices_url
  end
end
