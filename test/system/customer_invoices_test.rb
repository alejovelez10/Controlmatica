require "application_system_test_case"

class CustomerInvoicesTest < ApplicationSystemTestCase
  setup do
    @customer_invoice = customer_invoices(:one)
  end

  test "visiting the index" do
    visit customer_invoices_url
    assert_selector "h1", text: "Customer Invoices"
  end

  test "creating a Customer invoice" do
    visit customer_invoices_url
    click_on "New Customer Invoice"

    fill_in "Cost center", with: @customer_invoice.cost_center_id
    fill_in "Delivery certificate file", with: @customer_invoice.delivery_certificate_file
    fill_in "Delivery certificate state", with: @customer_invoice.delivery_certificate_state
    fill_in "Invoice date", with: @customer_invoice.invoice_date
    fill_in "Invoice state", with: @customer_invoice.invoice_state
    fill_in "Invoice value", with: @customer_invoice.invoice_value
    fill_in "Reception report file", with: @customer_invoice.reception_report_file
    fill_in "Reception report state", with: @customer_invoice.reception_report_state
    fill_in "Sales order", with: @customer_invoice.sales_order_id
    click_on "Create Customer invoice"

    assert_text "Customer invoice was successfully created"
    click_on "Back"
  end

  test "updating a Customer invoice" do
    visit customer_invoices_url
    click_on "Edit", match: :first

    fill_in "Cost center", with: @customer_invoice.cost_center_id
    fill_in "Delivery certificate file", with: @customer_invoice.delivery_certificate_file
    fill_in "Delivery certificate state", with: @customer_invoice.delivery_certificate_state
    fill_in "Invoice date", with: @customer_invoice.invoice_date
    fill_in "Invoice state", with: @customer_invoice.invoice_state
    fill_in "Invoice value", with: @customer_invoice.invoice_value
    fill_in "Reception report file", with: @customer_invoice.reception_report_file
    fill_in "Reception report state", with: @customer_invoice.reception_report_state
    fill_in "Sales order", with: @customer_invoice.sales_order_id
    click_on "Update Customer invoice"

    assert_text "Customer invoice was successfully updated"
    click_on "Back"
  end

  test "destroying a Customer invoice" do
    visit customer_invoices_url
    page.accept_confirm do
      click_on "Destroy", match: :first
    end

    assert_text "Customer invoice was successfully destroyed"
  end
end
