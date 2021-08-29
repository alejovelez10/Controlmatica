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
#  last_user_edited_id    :integer
#  is_acepted             :boolean          default(FALSE)
#

class ReportExpense < ApplicationRecord
    belongs_to :cost_center
    belongs_to :user_invoice, class_name: "User"
    belongs_to :type_identification, class_name: "ReportExpenseOption", :optional => true
    belongs_to :payment_type, class_name: "ReportExpenseOption", :optional => true
    belongs_to :last_user_edited, :class_name => "User", optional: :true
    belongs_to :user, optional: :true
    before_update :edit_values

    def edit_values
      self.last_user_edited_id = User.current.id
    end 

    def self.search(search1, search2, search3, search4, search5, search6, search7, search8, search9, search10, search11, search12)
        search1 != "" ? (scope :centro, -> { where(cost_center_id: search1) }) : (scope :centro, -> { where.not(id: nil) })
        search2 != "" ? (scope :user, -> { where(user_invoice_id: search2) }) : (scope :user, -> { where.not(id: nil) })
        search3 != "" ? (scope :name_gasto, -> { where("invoice_name like '%#{search3.downcase}%' or invoice_name like '%#{search3.upcase}%' or invoice_name like '%#{search3.capitalize}%' ") }) : (scope :name_gasto, -> { where.not(id: nil) })
        search4 != "" ? (scope :date, -> { where(invoice_date: search4) }) : (scope :date, -> { where.not(id: nil) })
        search5 != "" ? (scope :indetificacion, -> { where(identification: search5) }) : (scope :indetificacion, -> { where.not(id: nil) })
        search6 != "" ? (scope :descripcion, -> { where("description like '%#{search6.downcase}%' or description like '%#{search6.upcase}%' or description like '%#{search6.capitalize}%' ") }) : (scope :descripcion, -> { where.not(id: nil) })
        search7 != "" ? (scope :numero_factura, -> { where(invoice_number: search7) }) : (scope :numero_factura, -> { where.not(id: nil) })
        search8 != "" ? (scope :tipo_identificacion, -> { where(type_identification_id: search8) }) : (scope :tipo_identificacion, -> { where.not(id: nil) })
        search9 != "" ? (scope :tipo_pago, -> { where(payment_type_id: search9) }) : (scope :tipo_pago, -> { where.not(id: nil) })
        search10 != "" ? (scope :valor_factura, -> { where(invoice_value: search10) }) : (scope :valor_factura, -> { where.not(id: nil) })
        search11 != "" ? (scope :inpuesto_factura, -> { where(invoice_tax: search11) }) : (scope :inpuesto_factura, -> { where.not(id: nil) })
        search12 != "" ? (scope :total_factura, -> { where(invoice_total: search12) }) : (scope :total_factura, -> { where.not(id: nil) })

        centro.user.name_gasto.date.indetificacion.descripcion.numero_factura.tipo_identificacion.tipo_pago.valor_factura.inpuesto_factura.total_factura
    end

    def self.import(file, user)
		spreadsheet = Roo::Spreadsheet.open(file.path)
		header = spreadsheet.row(1)
	
		header[0] = "cost_center_id"
		header[1] = "user_invoice_id"
		header[2] = "invoice_name"
		header[3] = "invoice_date"
		header[4] = "identification"
		header[5] = "description"
    header[6] = "invoice_number"
    header[7] = "type_identification_id"
    header[8] = "payment_type_id"
    header[9] = "invoice_value"
    header[10] = "invoice_tax"
    header[11] = "invoice_total"
	
		(2..spreadsheet.last_row).each do |i|
		  row = Hash[[header, spreadsheet.row(i)].transpose]  

		  report_expense = find_by(id: row["id"]) || new
		  report_expense.attributes = row.to_hash

      user_invoice = User.find_by_name(row["user_invoice_id"].upcase)
      cost_center = CostCenter.find_by_name(row["cost_center_id"].upcase)
      type_identification = ReportExpenseOption.find_by_name(row["type_identification_id"].upcase)
      payment_type = ReportExpenseOption.find_by_name(row["payment_type_id"].upcase)

      value_user_invoice = (user_invoice.present? ? user_invoice.id : "")
      value_cost_center = (cost_center.present? ? cost_center.id : "")
      value_type_identification = (type_identification.present? ? type_identification.id : "")
      value_payment_type = (payment_type.present? ? payment_type.id : "")

		  report_expense.user_id = user

      report_expense.user_invoice_id = value_user_invoice
      report_expense.cost_center_id = value_cost_center
      report_expense.type_identification_id = value_type_identification
      report_expense.payment_type_id = value_payment_type

		  report_expense.save!
		end
	end
	
	def self.open_spreadsheet(file)
		case File.extname(file.original_filename)
		when ".csv" then Roo::CSV.new(file.path, nil, :ignore)
		when ".xls" then Roo::Excel.new(file.path, nil, :ignore)
		when ".xlsx" then Roo::Excelx.new(file.path, nil, :ignore)
	else raise "Unknown file type: #{file.original_filename}"
		end
	end
    
end

=begin
      pruebaValue = Hash[[prueba, spreadsheet.row(i)].transpose]

      row.delete("NUMERO DE CUENTA")
      row.delete("TIPO DE CUENTA")
      row.delete("BANCO")

      partner = find_by(id: row["id"]) || new
      partner.attributes = row.to_hash
      partner.user_id = user_id
      partner.agreement_id = agreement_id
      partner.save!

      tipo_cuenta = TypeAccount.find_by_name(pruebaValue["type_account_id"].upcase)
      banco = Bank.find_by_name(pruebaValue["bank_id"].upcase)

      value_account = tipo_cuenta.present? ? tipo_cuenta.id : ""
      value_bank = banco.present? ? banco.id : ""
=end