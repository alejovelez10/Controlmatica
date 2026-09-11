# == Schema Information
#
# Table name: report_expenses
#
#  id                        :bigint           not null, primary key
#  accounting_approved       :boolean          default(FALSE), not null
#  accounting_approved_at    :datetime
#  budget_reason             :string
#  budget_status             :string           default("sin_presupuesto"), not null
#  currency                  :string           default("COP"), not null
#  description               :text
#  exchange_rate             :decimal(18, 6)
#  exchange_rate_date        :date
#  exchange_rate_source      :string
#  foreign_tax               :decimal(15, 2)
#  foreign_total             :decimal(15, 2)
#  foreign_value             :decimal(15, 2)
#  identification            :string
#  invoice_date              :date
#  invoice_name              :string
#  invoice_number            :string
#  invoice_tax               :float            default(0.0)
#  invoice_total             :float            default(0.0)
#  invoice_type              :string
#  invoice_value             :float            default(0.0)
#  is_acepted                :boolean          default(FALSE)
#  payment_type              :string
#  receipt_file              :string
#  rule_violations           :jsonb            not null
#  type_identification       :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  accounting_approved_by_id :integer
#  cost_center_id            :integer
#  expense_budget_id         :integer
#  last_user_edited_id       :integer
#  payment_type_id           :integer
#  type_identification_id    :integer
#  user_id                   :integer
#  user_invoice_id           :integer
#
# Indexes
#
#  index_report_expenses_on_accounting_approved_and_date       (accounting_approved,invoice_date)
#  index_report_expenses_on_budget_status                      (budget_status)
#  index_report_expenses_on_cost_center_id                     (cost_center_id)
#  index_report_expenses_on_created_at                         (created_at)
#  index_report_expenses_on_expense_budget_id                  (expense_budget_id)
#  index_report_expenses_on_foreign_currency                   (currency) WHERE ((currency)::text <> 'COP'::text)
#  index_report_expenses_on_invoice_date                       (invoice_date)
#  index_report_expenses_on_invoice_number_and_identification  (invoice_number,identification)
#  index_report_expenses_on_is_acepted                         (is_acepted)
#  index_report_expenses_on_payment_type_id                    (payment_type_id)
#  index_report_expenses_on_type_identification_id             (type_identification_id)
#  index_report_expenses_on_user_id                            (user_id)
#  index_report_expenses_on_user_invoice_id                    (user_invoice_id)
#

require 'test_helper'

class ReportExpenseTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end

  # --- Comprobante obligatorio (EXPENSE_RECEIPT_REQUIRED) --------------------

  def atributos_basicos
    { user: users(:admin),
      cost_center: cost_centers(:centro_con_viaticos),
      user_invoice: users(:ingeniero),
      invoice_name: "Hotel",
      invoice_date: Date.new(2026, 6, 1),
      invoice_number: "FE-FLAG-#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: 10_000.0, invoice_tax: 0.0, invoice_total: 10_000.0 }
  end

  def crear_gasto_basico
    as_user(users(:admin)) { ReportExpense.create!(atributos_basicos) }
  end

  test "con el flag apagado un gasto sin comprobante se crea" do
    # ES EL DEFAULT, y a proposito: encender la regla de golpe le corta el
    # registro a toda la gente que hoy sube gastos sin adjuntar nada.
    refute ReportExpense.comprobante_obligatorio?
    assert crear_gasto_basico.persisted?
  end

  test "con el flag encendido un gasto sin comprobante no se crea" do
    con_comprobante_obligatorio do
      gasto = ReportExpense.new(atributos_basicos)
      refute gasto.valid?
      assert_match(/comprobante/i, gasto.errors.full_messages.join(" "))
    end
  end

  test "con el flag encendido editar un gasto viejo sin comprobante sigue siendo posible" do
    # Los ~7.000 historicos no tienen comprobante: con la regla en updates no se
    # podrian ni aceptar ni contabilizar, que son updates sobre gastos viejos.
    gasto = crear_gasto_basico
    con_comprobante_obligatorio do
      assert gasto.update(invoice_name: "Nombre editado")
    end
  end
end
