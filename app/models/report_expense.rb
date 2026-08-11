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


class ReportExpense < ApplicationRecord
  belongs_to :cost_center
  belongs_to :user_invoice, class_name: "User"
  belongs_to :type_identification, class_name: "ReportExpenseOption", :optional => true
  belongs_to :payment_type, class_name: "ReportExpenseOption", :optional => true
  belongs_to :last_user_edited, :class_name => "User", optional: :true
  belongs_to :user, optional: :true
  # Trazabilidad de contra que partida se evaluo el gasto. Opcional porque un
  # gasto historico o uno sin partida vigente no apunta a ninguna, y porque
  # `dependent: :nullify` de ExpenseBudget lo deja en NULL al anular la partida.
  belongs_to :expense_budget, optional: true
  # Quien aprobo contablemente el gasto. Opcional porque el 99% de los gastos
  # nunca pasa por contabilidad y porque desaprobar lo vuelve a dejar en NULL.
  belongs_to :accounting_approved_by, class_name: "User", optional: true
  include RegisterAuditable

  # COMPROBANTE ADJUNTO (paquete 06).
  #
  # `mount_uploader` instala por si solo el borrado del archivo al destruir el
  # gasto (`after_commit :remove_receipt_file!, on: :destroy`): NO hay que
  # escribir codigo de limpieza, solo probarlo.
  #
  # Va DESPUES de los belongs_to y ANTES de audit_register para que su
  # `before_save :write_receipt_file_identifier` corra antes que el
  # `before_update` de la auditoria; si no, `receipt_file_changed?` seria false
  # y el cambio de comprobante no quedaria registrado.
  mount_uploader :receipt_file, ReceiptUploader

  # Etiquetas legibles de budget_status. Viven AQUI, en el dueño de la columna,
  # y no en cada consumidor: las leen la plantilla axlsx de contabilidad
  # (paquete 06) y las tools MCP (paquete 11). Duplicarlas garantiza que en
  # algun momento digan cosas distintas en pantalla y en Excel.
  BUDGET_STATUS_LABELS = { "sin_presupuesto" => "Sin presupuesto",
                           "aprobado"        => "Aprobado",
                           "excedido"        => "Excedido" }.freeze

  scope :presupuesto_aprobado, -> { where(budget_status: "aprobado") }
  scope :presupuesto_excedido, -> { where(budget_status: "excedido") }
  scope :sin_presupuesto,      -> { where(budget_status: "sin_presupuesto") }
  # Base literal de la pantalla de Contabilidad: un gasto excedido no entra a la
  # vista. Se define aqui para que el paquete 06 no la reescriba.
  scope :no_excedidos,         -> { where.not(budget_status: "excedido") }

  validates :budget_status, inclusion: { in: %w[sin_presupuesto aprobado excedido] }

  # === CONTABILIDAD (paquete 06) ===========================================
  #
  # `accounting_visible` es LA UNICA definicion de la base de la pantalla de
  # Contabilidad: ni el controller ni la plantilla axlsx pueden reescribir ese
  # `where`. Delega en `no_excedidos` (paquete 04, dueño de la columna) en vez
  # de repetir la condicion: dos literales de "excedido" en el codigo terminan
  # diciendo cosas distintas.
  #
  # UNICA EXCEPCION documentada (correccion 13 / §2.3): en las LECTURAS, con el
  # filtro "Aprobados por contabilidad" se amplia la base para recuperar los
  # gastos que alguien ya aprobo y un recalculo posterior empujo a `excedido`.
  # Esa ampliacion vive una sola vez, en `AccountingExpensesController#filtered_scope`,
  # y NUNCA en la aprobacion masiva.
  scope :accounting_visible, -> { no_excedidos }
  scope :accounting_pending, -> { accounting_visible.where(accounting_approved: false) }

  def accounting_state_label
    accounting_approved ? "Aprobado" : "Pendiente"
  end

  # La URL del comprobante tal cual la emite CarrierWave.
  #
  # OJO (Riesgo 2 del paquete 06): con `fog_public = false` esta URL viene
  # FIRMADA y expira a los 600 s desde el momento de serializar. Sirve para el
  # MCP y para saber si hay comprobante; la tabla del navegador debe usar
  # /download_receipt/report_expenses/:id, que firma en el clic.
  def receipt_file_url
    receipt_file.present? ? receipt_file.url : nil
  end

  # === MULTIMONEDA (paquete 05) ============================================
  #
  # INVARIANTE DURA: invoice_value / invoice_tax / invoice_total estan SIEMPRE
  # en pesos. El valor tal como aparece en el comprobante vive en foreign_*.
  # Guardar el valor extranjero en invoice_value es el unico error de este
  # paquete que corrompe datos en silencio y a escala: recalculate_cost_center
  # suma invoice_value y de ahi se propaga a aiu, aiu_percent, aiu_real y
  # aiu_percent_real del centro de costos.
  #
  # Parametro VIRTUAL (no es columna, no hay migracion). Sin el, el servidor
  # tendria que adivinar en cada save si el invoice_value que llego es un
  # ajuste manual del usuario o el calculo del navegador, comparandolo contra
  # el calculado; si el usuario ajusta a un numero que casualmente coincide, o
  # si el redondeo del navegador difiere en un centavo, adivina mal y le borra
  # el ajuste. Lo permiten los strong params del paquete 07 y lo envia el 08.
  attr_accessor :cop_manual_override

  before_validation :normalize_currency
  before_validation :backfill_foreign_total
  before_validation :apply_currency_conversion

  validates :currency, presence: true,
            inclusion: { in: Currency::CODES, message: "no es una moneda soportada" }
  validates :exchange_rate, numericality: { greater_than: 0 }, allow_nil: true
  validates :foreign_value, :foreign_tax, :foreign_total,
            numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :exchange_rate_source, inclusion: { in: ExchangeRate::SOURCES }, allow_nil: true
  validate :foreign_fields_required_when_foreign_currency

  # BigDecimal en toda la aritmetica y `.to_f` SOLO despues del round: en Float,
  # 120 * 4120.5 da 494459.99999999994. invoice_* son columnas float por el
  # legado (invariante 2), asi que el float es inevitable, pero entra ya
  # redondeado a dos decimales.
  def self.to_cop(amount, rate)
    return nil if amount.nil? || rate.nil?

    (amount.to_d * rate.to_d).round(2).to_f
  end

  def foreign_currency? = Currency.foreign?(currency)

  def cop_manual_override? = ActiveModel::Type::Boolean.new.cast(cop_manual_override).present?
  # === FIN MULTIMONEDA =====================================================

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
  # PAQUETE 04. Se declara AL FINAL a proposito: el golden compara byte a byte y
  # el orden de los segmentos del HTML es el orden de esta lista. Cada paquete
  # que audite un campo nuevo agrega el suyo al final y nunca reordena el ajeno.
  audit_field :budget_status,          label: "Estado presupuestal"
  # PAQUETE 06. Igual que el 04: se agrega AL FINAL y solo a `edit_fields`.
  # Adjuntar, reemplazar o borrar un comprobante es una EDICION del gasto; en la
  # creacion el campo casi siempre viene vacio y auditarlo seria ruido.
  #
  # `kind: :scalar` a proposito aunque `receipt_file` sea un uploader montado:
  # `receipt_file_change` lo resuelve ActiveRecord sobre la COLUMNA string, asi
  # que el HTML muestra el nombre del archivo viejo y el del nuevo, que es
  # exactamente lo que un auditor quiere leer.
  #
  # Los campos de CONTABILIDAD (accounting_approved*) NO se declaran aqui a
  # proposito: su texto quedaria por debajo del umbral de 59 caracteres del
  # concern y no registraria nada. Esa auditoria se escribe explicitamente en
  # AccountingExpensesController con module "Contabilidad".
  audit_field :receipt_file,           label: "Comprobante"

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
    # budget_status va SOLO en edicion (paquete 04): en la creacion el estado
    # siempre se setea y auditarlo es ruido; en la eliminacion el registro
    # desaparece.
    edit_fields:   %i[cost_center_id user_invoice_id type_identification_id payment_type_id
                      invoice_date invoice_name description type_identification invoice_number
                      invoice_value invoice_tax invoice_total identification budget_status
                      receipt_file],
    create_min_length: 5,
    # 59 NO es arbitrario: es el largo exacto del encabezado de edicion. Si
    # alguien lo "redondea", cada save sin cambios (el controller hace uno en
    # cada create) empieza a producir un RegisterEdit fantasma.
    edit_min_length:   59
  )

  # === REGLAS DE GASTOS (paquete 14) ========================================
  #
  # POR QUE UN CALLBACK DEL MODELO Y NO UNA LLAMADA EN EL CONTROLLER: las tres
  # reglas deterministas tienen que aplicar IGUAL a un gasto que entra por la
  # web, a uno que entra por WhatsApp y a uno que entra por el import de Excel.
  # Puesto en el controller cubriria un solo canal y la asimetria no la notaria
  # nadie hasta la auditoria contable.
  #
  # Corre en `before_save` y no en `validate` a proposito: una violacion NO
  # impide guardar. Bloquear al usuario en campo, con la factura en la mano,
  # solo consigue que no reporte. Lo que si hace es impedir que el gasto quede
  # APROBADO presupuestalmente.
  #
  # Va DESPUES del `evaluate!` de ExpenseBudgetService —que corre sobre el objeto
  # en memoria antes del save— justamente para poder pisarle el `aprobado`.
  before_save :apply_expense_rules

  # Etiqueta de conveniencia para la pantalla y para el agente.
  def rule_violations_messages
    Array(rule_violations).map { |v| v.is_a?(Hash) ? (v["message"] || v[:message]) : v.to_s }.compact
  end

  def rule_violations? = Array(rule_violations).any?

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

  # === IMPORTACION DE EXCEL (paquete 06, tarea C2) ==========================
  #
  # POR QUE HAY DOS LAYOUTS Y NO UNO. El export y el import de esta aplicacion
  # YA estaban desalineados antes de este paquete: la plantilla vieja escribia 12
  # columnas con "Estado" en la posicion 9 y el import esperaba `invoice_value`
  # ahi. O sea, el archivo que la aplicacion exportaba no se podia reimportar.
  # Con solo "correr las posiciones" se romperian ademas los archivos legacy que
  # los usuarios tienen guardados en el disco. Por eso el layout se DETECTA.
  #
  # 18 posiciones, 13 campos escribibles. Cinco columnas son de SOLO LECTURA:
  # `ID` es la llave y no un atributo, y `Estado operativo`, `Estado presupuestal`
  # y `Motivo presupuestal` los escribe unicamente el sistema (§2.1). Aceptarlas
  # permitiria fabricarse una aprobacion presupuestal desde un Excel.
  LEGACY_HEADER_KEYS = %w[cost_center_id user_invoice_id invoice_date invoice_name identification
                          description invoice_number type_identification_id payment_type_id
                          invoice_value invoice_tax].freeze

  # Las tres claves con guion bajo delante se leen y se TIRAN a proposito: estan
  # en la lista para que el mapeo posicional cuadre, no para asignarse.
  V2_HEADER_KEYS = %w[id cost_center_id user_invoice_id invoice_date invoice_name identification
                      description invoice_number type_identification_id payment_type_id
                      _estado_operativo _budget_status _budget_reason currency foreign_value
                      exchange_rate invoice_value invoice_tax].freeze

  # Un archivo es v2 si tiene 18 columnas o mas Y su primera celda dice "ID".
  # Las dos condiciones son necesarias: un legacy de 11 columnas nunca empieza en
  # "ID", y un archivo de 18 columnas al que le borraron la columna ID debe
  # tratarse como lo que es, un archivo que CREA gastos nuevos.
  def self.detect_layout(raw_header)
    first = raw_header[0].to_s.strip.downcase
    raw_header.compact.length >= 18 && first == "id" ? :v2 : :v1
  end

  def self.import(file, user)
    success_records = []
    fail_records = []
    spreadsheet = Roo::Spreadsheet.open(file.path)

    raw_header = spreadsheet.row(1)
    layout = detect_layout(raw_header)
    header = raw_header.dup
    (layout == :v2 ? V2_HEADER_KEYS : LEGACY_HEADER_KEYS).each_with_index { |clave, i| header[i] = clave }

    # `Rails.logger.debug` y no `puts`: los ocho puts anteriores volcaban los
    # datos de CADA factura al log de produccion.
    Rails.logger.debug { "ReportExpense.import: layout #{layout}, #{spreadsheet.last_row - 1} filas" }

    (2..spreadsheet.last_row).each do |i|
      row = Hash[[header, spreadsheet.row(i)].transpose]

      begin
        # Llave de actualizacion. En v1 no existe la columna, asi que `row["id"]`
        # es nil y siempre se crea, exactamente como hoy.
        report_expense = find_by(id: row["id"]) || new

        user_invoice = User.where("LOWER(TRIM(names)) = ?", row["user_invoice_id"].to_s.strip.downcase).first
        cost_center = CostCenter.where("LOWER(TRIM(code)) = ?", row["cost_center_id"].to_s.strip.downcase).first
        type_identification = ReportExpenseOption.where("LOWER(TRIM(name)) = ?", row["type_identification_id"].to_s.strip.downcase).first
        payment_type = ReportExpenseOption.where("LOWER(TRIM(name)) = ?", row["payment_type_id"].to_s.strip.downcase).first

        Rails.logger.debug do
          "ReportExpense.import fila #{i}: centro=#{cost_center&.id.inspect} " \
          "responsable=#{user_invoice&.id.inspect} tipo=#{type_identification&.id.inspect} " \
          "medio=#{payment_type&.id.inspect}"
        end

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

        apply_currency_from_row(report_expense, row) if layout == :v2

        report_expense.save!
        success_records << 1
      rescue => e
        # Una fila mala NO aborta el archivo: el usuario recibe la lista de
        # filas que hay que corregir y las demas quedan importadas.
        Rails.logger.debug { "ReportExpense.import fila #{i} fallo: #{e.message}" }
        fail_records << i
      end
    end

    [success_records, fail_records]
  end

  # Reglas de moneda del import. Son las dos que el paquete 05 dejo escritas como
  # contrato (test/models/report_expense_import_currency_test.rb) y que este
  # paquete absorbio al quedarse como dueño unico de `import`.
  def self.apply_currency_from_row(report_expense, row)
    moneda = Currency.normalize(row["currency"])
    # Una moneda que no esta en el catalogo cae a COP en vez de tumbar la fila:
    # el archivo lo escribe una persona y "usd " o "Dolares" son mas probables
    # que un ataque.
    moneda = Currency::DEFAULT unless Currency.valid?(moneda)
    report_expense.currency = moneda
    return unless Currency.foreign?(moneda)

    report_expense.foreign_value = row["foreign_value"].present? ? row["foreign_value"].to_d : nil
    report_expense.exchange_rate = row["exchange_rate"].present? ? row["exchange_rate"].to_d : nil
    # El Excel no trae la procedencia de la tasa y la fecha contable es la del
    # gasto (TRM vigente el dia de la operacion).
    report_expense.exchange_rate_date = row["invoice_date"]
    report_expense.exchange_rate_source = "manual"
    # INVARIANTE #3: si el archivo trae los pesos, se respetan como verdad; son
    # el cuadre que ya hizo contabilidad. Si la columna viene vacia, el modelo
    # los calcula desde foreign_value x exchange_rate. En NINGUN caso se
    # recalcula encima de un valor que el usuario escribio.
    report_expense.cop_manual_override = row["invoice_value"].present?
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

  # === MULTIMONEDA (paquete 05): callbacks privados ========================

  # La moneda llega de un <select>, de una celda de Excel y de la tool MCP.
  # `presence ||` cubre el caso de la columna vacia: sin default explicito, un
  # gasto sin moneda quedaria en "" y fallaria la inclusion en vez de asumir
  # pesos, que es lo que el 100% de los gastos historicos son.
  def normalize_currency
    self.currency = Currency.normalize(currency).presence || Currency::DEFAULT
  end

  def backfill_foreign_total
    return unless foreign_currency?

    # La fecha de la tasa por defecto es la del gasto: es la regla contable
    # colombiana (TRM vigente en la fecha de la operacion).
    self.exchange_rate_date ||= invoice_date
    # Espeja lo que ya hacen los dos formularios: el usuario escribe valor e
    # IVA y el total se completa solo.
    self.foreign_total ||= (foreign_value.to_d + foreign_tax.to_d) if foreign_value.present?
  end

  def apply_currency_conversion
    unless foreign_currency?
      # Volver a COP LIMPIA los seis campos. Dejar residuos de moneda
      # extranjera en un gasto en pesos produce filas del Excel que se leen
      # como conversiones falsas.
      self.foreign_value = self.foreign_tax = self.foreign_total = nil
      self.exchange_rate = self.exchange_rate_date = self.exchange_rate_source = nil
      return
    end

    return if exchange_rate.blank?

    if cop_manual_override?
      self.exchange_rate_source = "manual"
      return # el servidor respeta los COP que mando el cliente
    end

    # Sin override, el servidor SIEMPRE tiene la ultima palabra y pisa lo que
    # haya llegado en invoice_*.
    self.invoice_value = self.class.to_cop(foreign_value, exchange_rate)
    self.invoice_tax   = self.class.to_cop(foreign_tax,   exchange_rate)
    # invoice_total es la conversion del TOTAL del comprobante, no la suma de
    # los dos COP anteriores: es el numero que contabilidad quiere ver. La
    # diferencia maxima por redondeo es de un centavo de peso y ningun calculo
    # del centro de costos usa invoice_total.
    self.invoice_total = self.class.to_cop(foreign_total, exchange_rate)
  end

  def foreign_fields_required_when_foreign_currency
    return unless foreign_currency?

    errors.add(:foreign_value, "es obligatorio cuando la moneda no es COP") if foreign_value.blank?
    errors.add(:exchange_rate, "es obligatoria cuando la moneda no es COP") if exchange_rate.blank?
  end

  # Evalua las reglas del paquete 14 y deja la foto en `rule_violations`.
  #
  # SE PERSISTE Y NO SE RECALCULA AL LEER: una violacion es una foto del momento
  # en que se registro el gasto. Si el administrador afloja la regla manana, el
  # gasto de hoy no deberia dejar de estar marcado de forma retroactiva; y al
  # reves, endurecerla no puede convertir en infractores a 5.000 gastos
  # historicos.
  def apply_expense_rules
    resultado = ExpenseRuleService.validate(self)
    violaciones = resultado.value[:violations]

    # `.map(&:stringify_keys)` porque jsonb devuelve siempre claves String: sin
    # esto, el objeto en memoria y el releido de la base tendrian formas
    # distintas y cualquier comparacion en un test seria un falso negativo.
    self.rule_violations = violaciones.map(&:stringify_keys)

    return if violaciones.empty?
    # UNA VIOLACION NUNCA IMPIDE GUARDAR, PERO IMPIDE QUE QUEDE APROBADO.
    # No se pasa a `excedido`: eso lo sacaria de la vista de contabilidad
    # (scope accounting_visible) y contabilidad tiene que verlo justamente para
    # decidir. `sin_presupuesto` consume cupo igual, asi que tampoco libera
    # plata que en realidad esta comprometida.
    return unless budget_status == ExpenseBudgetService::STATUS_APROBADO

    self.budget_status = ExpenseBudgetService::STATUS_SIN_PRESUPUESTO
    motivo = violaciones.map { |v| v[:message] }.join(" ")
    # `budget_reason` es un string de 255: con tres violaciones largas el texto
    # se pasa y Postgres corta la escritura entera. El detalle completo queda en
    # `rule_violations`, que es jsonb y no tiene ese limite.
    self.budget_reason = "No se aprueba por incumplir las reglas de gasto: #{motivo}".truncate(250)
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
