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

# Contrato B.1 de 00-ARQUITECTURA.md. DUENO UNICO: paquete 07 (§7.2).
#
# POR QUE ESTE ARCHIVO TIENE UN SOLO DUENO Y NO TRES: los 13 atributos nuevos
# son la union exacta de lo que necesitaban el 05 (los 7 de moneda) y el 06 (los
# 3 contables + el belongs_to del aprobador). Con tres duenos, el segundo en
# mergear sobrescribia la lista de `attributes` del primero y el frontend perdia
# columnas sin que ninguna prueba lo notara.
class ReportExpenseSerializer < ActiveModel::Serializer
  # Los 19 primeros son los originales y NO se reordenan: el orden de
  # `attributes` es el orden de las claves del JSON, y el 09 arma columnas por
  # posicion en algunas tablas.
  attributes :id, :invoice_name, :invoice_date, :identification, :description, :invoice_number,
             :invoice_type, :payment_type, :invoice_value, :invoice_tax, :invoice_total,
             :cost_center_id, :user_invoice_id, :user_invoice, :type_identification_id,
             :payment_type_id, :updated_at, :is_acepted, :created_at,
             # --- presupuesto (paquete 04, expuesto aqui) ---
             :budget_status, :budget_reason, :expense_budget_id,
             # --- contabilidad (paquete 06, expuesto aqui) ---
             :accounting_approved, :accounting_approved_at,
             # --- comprobante (paquete 06, expuesto aqui) ---
             :receipt_file,
             # --- multimoneda (paquete 05, expuesto aqui) ---
             :currency, :foreign_value, :foreign_tax, :foreign_total,
             :exchange_rate, :exchange_rate_date, :exchange_rate_source

  belongs_to :cost_center, serializer: CostCenterSerializer

  belongs_to :type_identification, serializer: ReportExpenseOptionSerializer
  belongs_to :payment_type, serializer: ReportExpenseOptionSerializer
  belongs_to :last_user_edited, serializer: UserSerializer
  belongs_to :user, serializer: UserSerializer
  belongs_to :accounting_approved_by, serializer: UserSerializer

  # PROHIBIDO agregar `belongs_to :expense_budget` (§4.3): colisionaria con el
  # atributo `expense_budget_id`, y este archivo ya arrastra una colision
  # preexistente (`attributes :payment_type` + `belongs_to :payment_type`) que la
  # arquitectura prohibe empeorar. Si la UI necesita el nombre de la partida, se
  # trae aparte desde el paquete de frontend.

  def user_invoice
    return nil unless object.user_invoice.present?
    {
      id: object.user_invoice.id,
      names: object.user_invoice.names
    }
  end

  # SIN ESTE METODO CarrierWave serializa `{"url": null}` cuando no hay archivo,
  # y el contrato B.1 dice `null` a secas. El frontend hace
  # `gasto.receipt_file && gasto.receipt_file.url`: con el hash vacio el boton de
  # "ver comprobante" aparece para gastos que no tienen ninguno.
  def receipt_file
    return nil unless object.receipt_file.present?
    { url: object.receipt_file.url }
  end
end
