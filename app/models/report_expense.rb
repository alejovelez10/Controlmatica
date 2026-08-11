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


class ReportExpense < ApplicationRecord
  belongs_to :cost_center
  belongs_to :user_invoice, class_name: "User"
  belongs_to :type_identification, class_name: "ReportExpenseOption", :optional => true
  belongs_to :payment_type, class_name: "ReportExpenseOption", :optional => true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  belongs_to :user, optional: :true
  before_update :edit_values
  before_update :create_edit_register
  after_create :create_create_register
  before_destroy :create_destroy_register

  def edit_values
    self.last_user_edited_id = current_actor_id
  end

  # Lista canonica de filtros de la pantalla de Gastos. Todo filtro nuevo tiene
  # que agregarse AQUI ademas de en el builder: el controller hace
  # params.permit(*SEARCH_KEYS) y lo que no este listado se descarta en silencio.
  # La reutiliza AccountingExpensesController (paquete de Contabilidad).
  SEARCH_KEYS = %i[
    cost_center_id user_invoice_id invoice_name invoice_date identification description
    invoice_number type_identification_id payment_type_id invoice_value invoice_tax
    invoice_total start_date end_date is_acepted
  ].freeze

  # Builder de filtros con firma de hash. Mismo patron que CostCenter.search, que
  # es el precedente correcto del repo.
  #
  # POR QUE NO ES UN CAMBIO COSMETICO: la version anterior definia 15 scopes de
  # CLASE en runtime en cada llamada. Un scope vive en la clase, no en la
  # llamada, asi que dos peticiones simultaneas se pisaban los filtros y un
  # usuario podia recibir los gastos filtrados por los criterios de otro.
  #
  # `scope = all` (y NO `unscoped` ni `where(nil)`) es lo que preserva el
  # receptor: ActiveRecord::Delegation ejecuta este metodo dentro de `scoping`,
  # asi que ReportExpense.where(user_invoice_id: x).search(...) sigue respetando
  # esa condicion. Con `unscoped` devolveria los gastos de todos los usuarios.
  #
  # `.present?` como guarda en los 15 (no `.nil?`): params[:is_acepted] == "false"
  # es present? y debe filtrar; los "" no deben filtrar.
  def self.search(filters = {})
    f = filters.symbolize_keys
    scope = all
    scope = scope.where(cost_center_id: f[:cost_center_id])                 if f[:cost_center_id].present?
    scope = scope.where(user_invoice_id: f[:user_invoice_id])               if f[:user_invoice_id].present?
    scope = scope.where("LOWER(invoice_name) LIKE ?", "%#{f[:invoice_name].to_s.downcase}%") if f[:invoice_name].present?
    scope = scope.where(invoice_date: f[:invoice_date])                     if f[:invoice_date].present?
    scope = scope.where(identification: f[:identification])                 if f[:identification].present?
    scope = scope.where("LOWER(description) LIKE ?", "%#{f[:description].to_s.downcase}%")   if f[:description].present?
    scope = scope.where(invoice_number: f[:invoice_number])                 if f[:invoice_number].present?
    scope = scope.where(type_identification_id: f[:type_identification_id]) if f[:type_identification_id].present?
    scope = scope.where(payment_type_id: f[:payment_type_id])               if f[:payment_type_id].present?
    scope = scope.where(invoice_value: f[:invoice_value])                   if f[:invoice_value].present?
    scope = scope.where(invoice_tax: f[:invoice_tax])                       if f[:invoice_tax].present?
    scope = scope.where(invoice_total: f[:invoice_total])                   if f[:invoice_total].present?
    scope = scope.where("invoice_date >= ?", f[:start_date])                if f[:start_date].present?
    scope = scope.where("invoice_date <= ?", f[:end_date])                  if f[:end_date].present?
    scope = scope.where(is_acepted: f[:is_acepted])                         if f[:is_acepted].present?
    scope
  end

  def self.import(file, user)
    success_records = []
    fail_records = []
    spreadsheet = Roo::Spreadsheet.open(file.path)
    puts spreadsheet.row(2)
    header = spreadsheet.row(1)

    header[0] = "cost_center_id"
    header[1] = "user_invoice_id"
    header[2] = "invoice_date"
    header[3] = "invoice_name"
    header[4] = "identification"
    header[5] = "description"
    header[6] = "invoice_number"
    header[7] = "type_identification_id"
    header[8] = "payment_type_id"
    header[9] = "invoice_value"
    header[10] = "invoice_tax"

    (2..spreadsheet.last_row).each do |i|
      row = Hash[[header, spreadsheet.row(i)].transpose]

      begin
        report_expense = find_by(id: row["id"]) || new

        puts "=== FILA #{i} ==="
        puts "  Centro de costo (Excel): '#{row["cost_center_id"]}'"
        puts "  Responsable (Excel): '#{row["user_invoice_id"]}'"
        puts "  Tipo (Excel): '#{row["type_identification_id"]}'"
        puts "  Medio de pago (Excel): '#{row["payment_type_id"]}'"

        user_invoice = User.where("LOWER(TRIM(names)) = ?", row["user_invoice_id"].to_s.strip.downcase).first
        cost_center = CostCenter.where("LOWER(TRIM(code)) = ?", row["cost_center_id"].to_s.strip.downcase).first
        type_identification = ReportExpenseOption.where("LOWER(TRIM(name)) = ?", row["type_identification_id"].to_s.strip.downcase).first
        payment_type = ReportExpenseOption.where("LOWER(TRIM(name)) = ?", row["payment_type_id"].to_s.strip.downcase).first

        puts "  Usuario encontrado: #{user_invoice.present? ? "SI (id: #{user_invoice.id})" : "NO"}"
        puts "  Centro encontrado: #{cost_center.present? ? "SI (id: #{cost_center.id})" : "NO"}"
        puts "  Tipo encontrado: #{type_identification.present? ? "SI (id: #{type_identification.id}, name: #{type_identification.name})" : "NO"}"
        puts "  Medio pago encontrado: #{payment_type.present? ? "SI (id: #{payment_type.id}, name: #{payment_type.name})" : "NO"}"

        report_expense.invoice_date = row["invoice_date"]
        report_expense.invoice_name = row["invoice_name"]
        report_expense.identification = row["identification"]
        report_expense.description = row["description"]
        report_expense.invoice_number = row["invoice_number"]
        report_expense.invoice_value = row["invoice_value"].to_f
        report_expense.invoice_tax = row["invoice_tax"].to_f
        report_expense.invoice_total = row["invoice_tax"].to_f + row["invoice_value"].to_f

        report_expense.user_id = user_invoice.present? ? user_invoice.id : nil
        report_expense.user_invoice_id = user_invoice.present? ? user_invoice.id : nil
        report_expense.cost_center_id = cost_center.present? ? cost_center.id : nil
        report_expense.type_identification_id = type_identification.present? ? type_identification.id : nil
        report_expense.payment_type_id = payment_type.present? ? payment_type.id : nil

        report_expense.save!
        puts "  GUARDADO OK"
        success_records << 1
      rescue => e
        puts "  ERROR en fila #{i}: #{e.message}"
        fail_records << i
      end
    end
    return [success_records, fail_records]
  end




  
  def create_edit_register
    self.last_user_edited_id = current_actor_id
    if self.cost_center_id_changed?
      names = []
      cost_center = CostCenter.where(id: self.cost_center_id_change)
      cost_center.each do |centro|
        names << centro.code
      end
      centro = "<p>Centro de costo: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      centro = ""
    end


    if self.user_invoice_id_changed?
      names = []
      users = User.where(id: self.user_invoice_id_change)
      users.each do |user|
        names << user.names
      end
      user = "<p>Usuario: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      user = ""
    end


    if self.type_identification_id_changed?
      names = []
      reports = ReportExpenseOption.where(id: self.type_identification_id_change)
      reports.each do |report|
        names << report.name
      end
      type_expense = "<p>Tipo de gasto: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      type_expense = ""
    end

    if self.payment_type_id_changed?
      names = []
      reports = ReportExpenseOption.where(id: self.payment_type_id_change)
      puts reports
      puts "asfadsfasfdsfdsfdasdfadsfsadfasfsdasfdasfsda"
      reports.each do |report|
        names << report.name
      end
      type_pay = "<p>Medio de pago: <b class='color-true'>#{names[1]}</b> / <b class='color-false'>#{names[0]}</b></p>"
    else
      type_pay = ""
    end

    date = self.invoice_date_changed? == true ? ("<p>Fecha: <b class='color-true'>#{self.invoice_date_change[0]}</b> / <b class='color-false'>#{self.invoice_date_change[1]}</b></p>") : ""
    name = self.invoice_name_changed? == true ? ("<p>>Nombre: <b class='color-true'>#{self.invoice_name_change[0]}</b> / <b class='color-false'>#{self.invoice_name_change[1]}</b></p>") : ""
    description = self.description_changed? == true ? ("<p>Descripcion: <b class='color-true'>#{self.description_change[0]}</b> / <b class='color-false'>#{self.description_change[1]}</b></p>") : ""
    type_identification =  self.type_identification_changed? == true ? ("<p>Tipo de identificacion: <b class='color-true'>#{self.type_identification_change[0]}</b> / <b class='color-false'>#{self.type_identification_change[1]}</b></p>") : ""
    identificacion = self.identification_changed? == true ? ("<p>NIT/IDENTIFICACIÓN: <b class='color-true'>#{self.identification_change[0]}</b> / <b class='color-false'>#{self.identification_change[1]}</b></p>") : ""
    invoice_number =  self.invoice_number_changed? == true ? ("<p>Numero de factura: <b class='color-true'>#{self.invoice_number_change[0]}</b> / <b class='color-false'>#{self.invoice_number_change[1]}</b></p>") : ""
    invoice_value =  self.invoice_value_changed? == true ? ("<p>Valor: <b class='color-true'>#{self.invoice_value_change[0]}</b> / <b class='color-false'>#{self.invoice_value_change[1]}</b></p>") : ""
    invoice_tax =  self.invoice_tax_changed? == true ? ("<p>IVA: <b class='color-true'>#{self.invoice_tax_change[0]}</b> / <b class='color-false'>#{self.invoice_tax_change[1]}</b></p>") : ""
    invoice_total =  self.invoice_total_changed? == true ? ("<p>Total: <b class='color-true'>#{self.invoice_total_change[0]}</b> / <b class='color-false'>#{self.invoice_total_change[1]}</b></p>") : ""


    str = "#{centro}#{user}#{type_expense}#{type_pay}#{date}#{name}#{description}#{type_identification}#{invoice_number}#{invoice_value}#{invoice_tax}#{invoice_total}#{identificacion}"
  
    str = "<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p>" + str
    if str.length > 59
      RegisterEdit.create(
        user_id: current_actor_id,
        register_user_id: self.id,
        state: "pending",
        date_update: Time.now,
        module: "Gatos",
        description: str,
      )
    end
  end



    def create_create_register
      if self.cost_center_id?
      
        cost_center = CostCenter.where(id: self.cost_center_id).take
        centro = "<p>Centro de costo: <b>#{cost_center.code}</b></p>"
      else
        centro = ""
      end
      
      
      if self.user_invoice_id?
        user= User.where(id: self.user_invoice_id).take
        user = "<p>Usuario: <b>#{user.names}</b></p>"
      else
        user = ""
      end
      
      
      if self.type_identification_id?
        report = ReportExpenseOption.where(id: self.type_identification_id).take
        type_expense = "<p>Tipo de gasto: <b>#{report.name}</b> </p>"
      else
        type_expense = ""
      end
      
      if self.payment_type_id?
        report = ReportExpenseOption.where(id: self.payment_type_id).take
        type_pay = "<p>Medio de pago: <b>#{report.name}</b> </p>"
      else
        type_pay = ""
      end

      
      puts centro 
      date = "<p>Fecha:#{self.invoice_date}</b> </p>"
      name = "<p>Nombre: #{self.invoice_name}</b></p> "
      description = "<p>Descripción: #{self.description}</b></p>"
      identificacion = "<p>NIT/IDENTIFICACIÓN: #{self.identification}</b></p> "
      invoice_number =  "<p>Numero de factura:#{self.invoice_number}</b></p> "
      invoice_value =  "<p>Valor: <b >#{self.invoice_value}</b></p>"
      invoice_tax = "<p>IVA: <b >#{self.invoice_tax}</b> "
      invoice_total =  "<p>Total: <b >#{self.invoice_total}</b> </p>"
  
      
      str = "#{centro }#{user} #{type_expense} #{type_pay} #{date} #{name} #{description} #{identificacion} #{invoice_number} #{invoice_value} #{invoice_tax} #{invoice_total} #{identificacion}"
      str = "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>" + str
      puts str  
      if str.length > 5
        RegisterEdit.create(
          user_id: current_actor_id,
          register_user_id: self.id,
          state: "pending",
          date_update: Time.now,
          module: "Gatos",
          description: str,
          type_edit: "creo"
        )
      end
      
  end


  def create_destroy_register
    if self.cost_center_id?
    
      cost_center = CostCenter.where(id: self.cost_center_id).take
      centro = "<p>Centro de costo: <b>#{cost_center.code}</b></p>"
    else
      centro = ""
    end
    
    
    if self.user_invoice_id?
      user= User.where(id: self.user_invoice_id).take
      user = "<p>Usuario: <b>#{user.names}</b></p>"
    else
      user = ""
    end
    
    
    if self.type_identification_id?
      report = ReportExpenseOption.where(id: self.type_identification_id).take
      type_expense = "<p>Tipo de gasto: <b>#{report.name}</b> </p>"
    else
      type_expense = ""
    end
    
    if self.payment_type_id?
      report = ReportExpenseOption.where(id: self.payment_type_id).take
      type_pay = "<p>Medio de pago: <b>#{report.name}</b> </p>"
    else
      type_pay = ""
    end

    
    puts centro 
    date = "<p>Fecha:#{self.invoice_date}</b> </p>"
    name = "<p>Nombre: #{self.invoice_name}</b></p> "
    description = "<p>Descripción: #{self.description}</b></p>"
    identificacion = "<p>NIT/IDENTIFICACIÓN: #{self.identification}</b></p> "
    invoice_number =  "<p>Numero de factura:#{self.invoice_number}</b></p> "
    invoice_value =  "<p>Valor: <b >#{self.invoice_value}</b></p>"
    invoice_tax = "<p>IVA: <b >#{self.invoice_tax}</b> "
    invoice_total =  "<p>Total: <b >#{self.invoice_total}</b> </p>"

    
    str = "#{centro }#{user} #{type_expense} #{type_pay} #{date} #{name} #{description} #{identificacion} #{invoice_number} #{invoice_value} #{invoice_tax} #{invoice_total} #{identificacion}"
    str = "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>" + str
    puts str  
    if str.length > 5
      RegisterEdit.create(
        user_id: current_actor_id,
        register_user_id: self.id,
        state: "pending",
        date_update: Time.now,
        module: "Gatos",
        description: str,
        type_edit: "elimino"
      )
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

  private

  # Actor de auditoria. User.current solo existe dentro de un request web
  # (ApplicationController#set_current_user); en tests, jobs, rake tasks, consola
  # y MCP es nil, y las 5 lecturas directas del id del actor reventaban con
  # NoMethodError.
  #
  # create_create_register es after_create, asi que cuando corre ya tiene
  # user_id / user_invoice_id disponibles como respaldo.
  #
  # Frontera: cuando el paquete 03 extraiga el concern RegisterAuditable, este
  # metodo pasa a ser `def current_actor_id = audit_actor_id`. Ese cambio lo hace
  # el 03, no este paquete.
  def current_actor_id
    User.current&.id || user_id || user_invoice_id || last_user_edited_id
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
