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
  include RegisterAuditable

  # edit_values se declara ANTES de audit_register para preservar el orden de
  # callbacks del legado: primero el edit_values del modelo, despues el
  # before_update de auditoria.
  before_update :edit_values

  def edit_values
    self.last_user_edited_id = current_actor_id
  end

  # LOS 13 CAMPOS AUDITADOS. Los formatos son literales del legado, con sus
  # rarezas incluidas: `</b>` huerfanos, `<b >` con espacio, "Descripcion" sin
  # tilde solo en edicion, el ">" de sobra en Nombre. Los 14 golden de
  # test/models/report_expense_audit_legacy_test.rb los verifican byte a byte.
  # OJO: varios formatos terminan en ESPACIO; un editor que recorte espacios
  # finales rompe el contrato de forma invisible.
  audit_field :cost_center_id,         label: "Centro de costo", kind: :association,
              assoc_class: "CostCenter", assoc_attr: :code
  audit_field :user_invoice_id,        label: "Usuario", kind: :association,
              assoc_class: "User", assoc_attr: :names
  audit_field :type_identification_id, label: "Tipo de gasto", kind: :association,
              assoc_class: "ReportExpenseOption", assoc_attr: :name,
              create_format: "<p>%{label}: <b>%{value}</b> </p>"
  audit_field :payment_type_id,        label: "Medio de pago", kind: :association,
              assoc_class: "ReportExpenseOption", assoc_attr: :name,
              create_format: "<p>%{label}: <b>%{value}</b> </p>"
  audit_field :invoice_date,           label: "Fecha",
              create_format: "<p>%{label}:%{value}</b> </p>"
  audit_field :invoice_name,           label: "Nombre",
              create_format: "<p>%{label}: %{value}</b></p> ",
              edit_format:   "<p>>%{label}: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>"
  audit_field :description,            label: "Descripción",
              create_format: "<p>%{label}: %{value}</b></p>",
              edit_format:   "<p>Descripcion: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>"
  audit_field :identification,         label: "NIT/IDENTIFICACIÓN",
              create_format: "<p>%{label}: %{value}</b></p> "
  audit_field :invoice_number,         label: "Numero de factura",
              create_format: "<p>%{label}:%{value}</b></p> "
  audit_field :invoice_value,          label: "Valor",
              create_format: "<p>%{label}: <b >%{value}</b></p>"
  audit_field :invoice_tax,            label: "IVA",
              create_format: "<p>%{label}: <b >%{value}</b> "
  audit_field :invoice_total,          label: "Total",
              create_format: "<p>%{label}: <b >%{value}</b> </p>"
  audit_field :type_identification,    label: "Tipo de identificacion"   # columna string, solo edicion

  # create_fields repite `identification` a proposito: en creacion y borrado el
  # NIT sale DOS veces. Las dos listas no tienen ni el mismo orden ni los mismos
  # elementos (type_identification solo en edicion): son copia literal del
  # legado, no un error de transcripcion.
  audit_register(
    module_name:   "Gatos",                                                     # typo historico, se conserva
    create_header: "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>",
    edit_header:   "<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p>",
    create_fields: %i[cost_center_id user_invoice_id type_identification_id payment_type_id
                      invoice_date invoice_name description identification invoice_number
                      invoice_value invoice_tax invoice_total identification],
    create_no_joiner_after: %i[cost_center_id],
    edit_fields:   %i[cost_center_id user_invoice_id type_identification_id payment_type_id
                      invoice_date invoice_name description type_identification invoice_number
                      invoice_value invoice_tax invoice_total identification],
    create_min_length: 5,
    # 59 NO es arbitrario: es el largo exacto del encabezado de edicion. Si
    # alguien lo "redondea", cada save sin cambios (el controller hace uno en
    # cada create) empieza a producir un RegisterEdit fantasma.
    edit_min_length:   59
  )

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
  # Una sola implementacion del actor: la del concern. Se conserva el nombre
  # porque edit_values lo usa y porque el paquete 01 lo dejo documentado asi.
  def current_actor_id
    audit_actor_id
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
