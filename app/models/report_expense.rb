# == Schema Information
#
# Table name: report_expenses
#
#  id                     :bigint           not null, primary key
#  user_id                :integer
#  cost_center_id         :integer
#  user_invoice_id        :integer
#  invoice_name           :string
#  invoice_date           :date
#  type_identification    :string
#  description            :text
#  invoice_number         :string
#  invoice_type           :string
#  payment_type           :string
#  invoice_value          :float            default(0.0)
#  invoice_tax            :float            default(0.0)
#  invoice_total          :float            default(0.0)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  type_identification_id :integer
#  payment_type_id        :integer
#  identification         :string
#

class ReportExpense < ApplicationRecord
    belongs_to :cost_center
    belongs_to :user_invoice, class_name: "User"
    belongs_to :type_identification, class_name: "ReportExpenseOption", :optional => true
    belongs_to :payment_type, class_name: "ReportExpenseOption", :optional => true
    
    def self.search(search1, search2, search3, search4, search5, search6, search7, search8, search9, search10, search11, search12)
        search1 != "" ? (scope :centro, -> { where(cost_center_id: search1) }) : (scope :centro, -> { where.not(id: nil) })
        search2 != "" ? (scope :user, -> { where(user_invoice_id: search2) }) : (scope :user, -> { where.not(id: nil) })
        search3 != "" ? (scope :name_gasto, -> { where("invoice_name like '%#{search3.downcase}%' or invoice_name like '%#{search3.upcase}%' or invoice_name like '%#{search3.capitalize}%' ") }) : (scope :name_gasto, -> { where.not(id: nil) })
        search4 != "" ? (scope :date, -> { where(invoice_date: search4) }) : (scope :date, -> { where.not(id: nil) })
        search5 != "" ? (scope :indetification, -> { where(identification: search4) }) : (scope :indetification, -> { where.not(id: nil) })
        search6 != "" ? (scope :descripcion, -> { where("description like '%#{search6.downcase}%' or description like '%#{search6.upcase}%' or description like '%#{search6.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })

        search7 != "" ? (scope :numero_factura, -> { where(invoice_number: search7) }) : (scope :numero_factura, -> { where.not(id: nil) })
        search8 != "" ? (scope :tipo_factura, -> { where(invoice_type: search8) }) : (scope :tipo_factura, -> { where.not(id: nil) })
        search9 != "" ? (scope :tipo_pago, -> { where(payment_type: search9) }) : (scope :tipo_pago, -> { where.not(id: nil) })
        search10 != "" ? (scope :valor_factura, -> { where(invoice_value: search10) }) : (scope :valor_factura, -> { where.not(id: nil) })
        search11 != "" ? (scope :inpuesto_factura, -> { where(invoice_tax: search11) }) : (scope :inpuesto_factura, -> { where.not(id: nil) })
        search12 != "" ? (scope :total_factura, -> { where(invoice_total: search12) }) : (scope :total_factura, -> { where.not(id: nil) })

        centro.user.name_gasto.date.indetification.descripcion.numero_factura.tipo_factura.tipo_pago.valor_factura.inpuesto_factura.total_factura
    end
    
end
