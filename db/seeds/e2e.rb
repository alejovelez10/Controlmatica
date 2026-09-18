# Seed determinista para los E2E de Playwright.
#
# Reglas que este archivo NO puede romper:
# 1. Idempotente: correrlo N veces deja exactamente el mismo estado.
# 2. Determinista: cero `rand`, cero `.sample`, cero `Time.now` en los datos.
# 3. Acotado: NUNCA toca datos fuera del centro CM-E2E-01-2026 y del usuario
#    e2e@controlmatica.test. No trunca tablas: eso romperia a cualquiera que
#    tenga datos en su BD de test local.
#
# Se corre con:  RAILS_ENV=test bin/rails runner db/seeds/e2e.rb

CODIGO_CENTRO   = "CM-E2E-01-2026".freeze
EMAIL_E2E       = "e2e@controlmatica.test".freeze
PASSWORD_E2E    = "e2e-password-123".freeze
CLIENTE_E2E     = "CLIENTE E2E S.A.S".freeze

# --- 1. Actor de auditoria -----------------------------------------------
# PRIMERA LINEA por obligacion: los callbacks de CostCenter y ReportExpense
# leen User.current sin guarda de nil y revientan con NoMethodError.
rol_admin = Rol.find_or_create_by!(name: "Administrador")

admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first ||
        User.order(:id).first

if admin.nil?
  admin = User.new(
    email: "admin.e2e@controlmatica.test",
    names: "Admin",
    last_names: "E2E",
    rol_id: rol_admin.id,
    document_type: "CC",
    number_document: 100_000_999
  )
  admin.password = PASSWORD_E2E
  admin.save!
end

admin.update_columns(rol_id: rol_admin.id) if admin.rol_id != rol_admin.id
User.current = admin

# --- 1 bis. Alcance de la siembra (paquete 12, tareas 1 a 6) -------------
# Un centro de costo por spec: es la capa 1 de aislamiento de la suite
# funcional. Ningun spec lee ni escribe fuera de su CM-E2E-<SLUG>-2026, asi que
# el orden de ejecucion de los archivos es irrelevante y un fallo no contamina a
# los demas.
#
# REGLA DURA, verificable con grep: este archivo nunca escribe ni borra fuera de
# CostCenter.where(code: E2E_SCOPES.values.map { |v| v[:code] }) y de
# User.where("email LIKE '%@controlmatica.test'"). Prohibido destroy_all,
# delete_all sin where, y prohibido truncate.
E2E_SCOPES = {
  "SMOKE" => { code: "CM-E2E-01-2026",   viatic: 5_000_000.0 },  # del paquete 01, NO se toca
  "BUD"   => { code: "CM-E2E-BUD-2026",  viatic: 5_000_000.0 },
  "REC"   => { code: "CM-E2E-REC-2026",  viatic: 2_000_000.0 },
  "FX"    => { code: "CM-E2E-FX-2026",   viatic: 9_000_000.0 },
  "ACC"   => { code: "CM-E2E-ACC-2026",  viatic: 4_000_000.0 },
  "PERM"  => { code: "CM-E2E-PERM-2026", viatic: 1_000_000.0 },
  "PAG"   => { code: "CM-E2E-PAG-2026",  viatic: 8_000_000.0 },
  # Octavo scope, para los 4 escenarios de reglas de gasto del paquete 14. El
  # documento del 12 no los contemplaba (llegaron con el encargo), y meterlos en
  # un centro ajeno habria roto el aislamiento: una regla asignada a un
  # beneficiario que otro spec usa cambia el budget_status de SUS gastos.
  "RULE"  => { code: "CM-E2E-RULE-2026", viatic: 3_000_000.0 }
}.freeze

SCOPE = ENV.fetch("E2E_SCOPE", "ALL").upcase

# Un scope desconocido ABORTA sin escribir nada. Sin esto, un typo en el nombre
# del scope sembraria en silencio "nada" y el spec fallaria con un timeout de
# 15 s sin explicacion.
unless SCOPE == "ALL" || E2E_SCOPES.key?(SCOPE)
  abort("E2E_SCOPE desconocido: #{SCOPE}. Validos: ALL, #{E2E_SCOPES.keys.join(', ')}")
end

# El scope SMOKE (CM-E2E-01-2026) lo siembra el paquete 01 mas abajo y queda
# FUERA de este selector: su smoke.spec.js afirma exactamente 2 filas y cualquier
# dato extra lo pondria en rojo.
SCOPES_ACTIVOS = (SCOPE == "ALL" ? E2E_SCOPES.keys - ["SMOKE"] : [SCOPE] - ["SMOKE"]).freeze

# --- 2. Modulos, acciones y permisos del rol Administrador ---------------
# "Reportes de servicios" y "Tablero de Ingenieros" NO son opcionales:
# after_sign_in_path_for hace .id sobre ModuleControl.find_by_name sin guarda de
# nil, y el login por formulario es exactamente lo que hace auth.setup.js.
MODULOS = {
  "Gastos" => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Aceptar gasto",
               "Exportar a excel", "Ver todos", "Cambiar responsable"],
  "Centro de Costos" => ["Ingreso al modulo", "Editar"],
  "Presupuesto de gastos" => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"],
  "Contabilidad" => ["Ingreso al modulo", "Contabilizar", "Exportar a excel", "Ver todos"],
  "Reportes de servicios" => ["Ingreso al modulo"],
  "Tablero de Ingenieros" => ["Ver tablero"]
}.freeze

MODULOS.each do |nombre_modulo, acciones|
  mc = ModuleControl.find_or_create_by!(name: nombre_modulo) { |m| m.user_id = admin.id }
  acciones.each do |nombre_accion|
    am = AccionModule.find_or_create_by!(name: nombre_accion, module_control_id: mc.id) do |a|
      a.user_id = admin.id # belongs_to :user es REQUERIDO
    end
    rol_admin.accion_modules << am unless rol_admin.accion_modules.include?(am)
  end
end

# --- 3. Parametrizaciones que exige CostCenter#create_code ---------------
{
  "HORA HOMBRE COSTO"    => 50_000,
  "HORA HOMBRE COTIZADA" => 80_000,
  "HORA TABLERISTA COSTO" => 50_000,
  "HORA DESPLAZAMIENTO"  => 50_000
}.each do |nombre, valor|
  Parameterization.find_or_create_by!(name: nombre) { |p| p.money_value = valor }
end

# --- 3 bis. Fila de umbrales de alerta -----------------------------------
# `ApplicationHelper#recalculate_cost_center` hace `Alert.last` SIN guarda de nil
# y compara con `alert.ing_costo_med`. Ese helper corre en el `create`, el
# `update` y el `destroy` de todo gasto, asi que sin una fila en `alerts` el
# primer gasto que se crea por la web responde 500 ("Puma caught this error:
# undefined method `ing_costo_med' for nil"). En desarrollo y en produccion la
# fila existe desde siempre; en una BD de test recien preparada, no.
#
# Las columnas de umbral traen default en el esquema, asi que basta con crearla.
Alert.first || Alert.create!(name: "Umbrales E2E", user_id: admin.id,
                             ing_costo_med: 30, via_med: 100, desp_med: 100,
                             tab_costo_med: 30, mat_med: 30)

# --- 4. Usuario E2E ------------------------------------------------------
# find_or_initialize + la password SOLO si hace falta.
#
# TRAMPA QUE COSTO UNA HORA (paquete 12): reasignar la password en cada corrida
# regenera el hash de bcrypt, y Devise guarda en la sesion el
# `authenticatable_salt` (los primeros 29 caracteres de encrypted_password) para
# validarla. Consecuencia: cualquier spec que resembrara en `beforeAll`
# INVALIDABA su propio storageState y el siguiente `page.goto` aterrizaba en
# "Iniciar Sesión", con un fallo que no menciona ni la sesion ni el seed.
#
# La intencion original se conserva: si alguien cambia la clave en
# test/e2e/support/env.js, `valid_password?` falla y la password se reescribe
# sin tener que borrar la BD a mano.
usuario = User.find_or_initialize_by(email: EMAIL_E2E)
usuario.names           = "Ingeniero"
usuario.last_names      = "E2E"
usuario.rol_id          = rol_admin.id
usuario.document_type   = "CC"
usuario.number_document = 100_000_500
usuario.menu            = "nav-sm"
usuario.password        = PASSWORD_E2E unless usuario.persisted? && usuario.valid_password?(PASSWORD_E2E)
usuario.save!

# --- 5. Cliente ----------------------------------------------------------
cliente = Customer.find_or_initialize_by(code: "CLI-E2E")
cliente.name    = CLIENTE_E2E
cliente.nit     = "900999888-1"
cliente.user_id = admin.id
cliente.save!

# --- 6. Centro de costo --------------------------------------------------
# TRAMPA: before_create :create_code SOBRESCRIBE el code que se le pase. Si no
# se corrigiera despues, el spec buscaria un codigo que no existe y fallaria con
# un timeout de 15 s sin explicacion. Se usa update_column a proposito: salta
# callbacks y validaciones, que es justo lo que se quiere aqui.
centro = CostCenter.find_by(code: CODIGO_CENTRO) ||
         CostCenter.find_by(user_owner_id: usuario.id, customer_id: cliente.id)

if centro.nil?
  centro = CostCenter.create!(
    customer_id: cliente.id,
    user_id: admin.id,
    user_owner_id: usuario.id,
    description: "Centro de costo para pruebas E2E",
    start_date: Date.new(2026, 1, 15),
    end_date: Date.new(2026, 12, 31),
    execution_state: "EN EJECUCION",
    service_type: "PROYECTO",
    quotation_number: "COT-E2E-001",
    viatic_value: 5_000_000.0,
    engineering_value: 20_000_000.0,
    eng_hours: 100.0,
    hour_real: 50_000.0,
    hour_cotizada: 80_000.0,
    hours_contractor: 0.0,
    hours_contractor_real: 0.0,
    hours_contractor_invoices: 0.0
  )
end

centro.update_column(:code, CODIGO_CENTRO) if centro.code != CODIGO_CENTRO
centro.update_columns(viatic_value: 5_000_000.0, user_owner_id: usuario.id)

# --- 7. Opciones de gasto ------------------------------------------------
# Las categorias son literales: packs/ReportExpenseIndex.js filtra por
# "Tipo" y "Medio de pago".
tipo = ReportExpenseOption.find_or_create_by!(name: "Alimentacion", category: "Tipo") do |o|
  o.user_id = admin.id
end
pago = ReportExpenseOption.find_or_create_by!(name: "Efectivo", category: "Medio de pago") do |o|
  o.user_id = admin.id
end

# --- 8. Reset de datos transaccionales del centro E2E -------------------
# destroy y NO delete_all: los callbacks de auditoria tienen que correr, y para
# eso User.current ya esta seteado desde el paso 1.
ReportExpense.where(cost_center_id: centro.id).find_each(&:destroy)

GASTOS = [
  { numero: "FE-E2E-001", nombre: "Hotel E2E Uno", valor: 100_000.0, fecha: Date.new(2026, 6, 1) },
  { numero: "FE-E2E-002", nombre: "Hotel E2E Dos", valor: 200_000.0, fecha: Date.new(2026, 6, 2) }
].freeze

gastos = GASTOS.map do |g|
  ReportExpense.create!(
    # Misma excepcion que abajo: la siembra no adjunta archivos.
    omitir_comprobante_obligatorio: true,
    user_id: usuario.id,
    user_invoice_id: usuario.id,
    cost_center_id: centro.id,
    invoice_name: g[:nombre],
    invoice_date: g[:fecha],
    description: "Gasto semilla determinista para E2E",
    invoice_number: g[:numero],
    invoice_type: "Factura",
    identification: "900999888",
    type_identification_id: tipo.id,
    payment_type_id: pago.id,
    invoice_value: g[:valor],
    invoice_tax: 0.0,
    invoice_total: g[:valor]
  )
end

# =========================================================================
# SUITE FUNCIONAL (paquete 12). Todo lo de aqui abajo es el delta del 12
# sobre el andamiaje del 01: 6 centros mas, 5 usuarios, 3 roles, las partidas,
# los 12 gastos de contabilidad, los 57 de paginacion y seed-ids.json.
# =========================================================================

# --- 9. Roles y usuarios de la suite funcional ---------------------------
#
# NINGUNO SE LLAMA "Administrador", Y ESA ES LA CLAVE DEL ESCENARIO 8:
# layouts/user.html.erb pinta el menu si current_user.rol.name ==
# "Administrador" saltandose los permisos, e is_admin?
# (report_expenses_controller.rb) hace lo mismo. Un usuario con rol
# Administrador no puede probar NINGUNA denegacion.
#
# "Reportes de servicios / Ingreso al modulo" es obligatorio en los tres roles:
# sin el, after_sign_in_path_for manda a root_path (home#dashboard) y el
# auth-restricted.setup.js no puede afirmar nada estable.
ROLES_E2E = {
  # Beneficiarios de partidas. Registran gastos y ven la pantalla de Gastos.
  "Ingeniero E2E" => {
    "Gastos" => ["Ingreso al modulo", "Crear", "Editar", "Ver todos"],
    "Centro de Costos" => ["Ingreso al modulo"],
    "Reportes de servicios" => ["Ingreso al modulo"]
  },
  # Escenario 8: CERO acciones de Presupuesto y CERO de Contabilidad.
  "Limitado E2E" => {
    "Gastos" => ["Ingreso al modulo", "Crear"],
    "Centro de Costos" => ["Ingreso al modulo"],
    "Reportes de servicios" => ["Ingreso al modulo"]
  },
  # Encargo del paquete 09 (E7.9-E7.11): ENTRA a Contabilidad pero no aprueba ni
  # exporta, que es lo que hace @estados[:approve] == false y
  # @estados[:export] == false en el show.
  #
  # "Ver todos" ES OBLIGATORIO aqui, aunque el plan pedia "solo Ingreso al
  # modulo". Sin ese permiso, `AccountingExpensesController#filtered_scope`
  # acota la bandeja a `user_invoice_id: current_user.id` y este usuario ve CERO
  # filas: los tres escenarios negativos exigen el control positivo "la tabla
  # renderiza CON datos", porque sin el un 500 daria los mismos toHaveCount(0) y
  # las pruebas pasarian por la razon equivocada. Lo que el encargo pide de
  # verdad —ni Contabilizar ni Exportar— se conserva intacto.
  "Contable E2E" => {
    "Gastos" => ["Ingreso al modulo"],
    "Centro de Costos" => ["Ingreso al modulo"],
    "Reportes de servicios" => ["Ingreso al modulo"],
    "Contabilidad" => ["Ingreso al modulo", "Ver todos"]
  }
}.freeze

# Asignacion EXACTA: se reemplaza la coleccion entera en vez de agregar. Sin
# esto, quitarle una accion a un rol exigiria borrar la BD a mano, y el test
# "cero acciones de Presupuesto" pasaria hoy y fallaria manana.
def rol_e2e!(nombre, definicion, admin)
  rol = Rol.find_or_create_by!(name: nombre)

  acciones = definicion.flat_map do |modulo, nombres|
    mc = ModuleControl.find_or_create_by!(name: modulo) { |m| m.user_id = admin.id }
    nombres.map do |accion|
      # `a.user_id` es obligatorio: AccionModule belongs_to :user y no es opcional.
      AccionModule.find_or_create_by!(name: accion, module_control_id: mc.id) { |a| a.user_id = admin.id }
    end
  end

  rol.accion_modules = acciones
  rol
end

# OJO CON `names`: los tres selects de persona del proyecto (el responsable del
# gasto, el beneficiario de la partida y el filtro) etiquetan cada opcion con
# `user.names` A SECAS, sin apellido. Las fixtures del paquete 01 ya tienen una
# usuaria llamada "Ana", asi que un beneficiario llamado tambien "Ana" produce
# dos opciones IDENTICAS en el desplegable y el spec selecciona la que el orden
# de la base decida ese dia. Por eso los tres beneficiarios llevan el sufijo
# dentro de `names`: la etiqueta tiene que ser unica.
def usuario_e2e!(email:, names:, last_names:, rol:, documento:)
  u = User.find_or_initialize_by(email: email)
  u.names           = names
  u.last_names      = last_names
  u.rol_id          = rol.id
  u.document_type   = "CC"
  u.number_document = documento
  u.menu            = "nav-sm"
  # Misma trampa del paso 4: reescribir la password en cada corrida cambia el
  # salt de Devise e invalida los storageState de los usuarios restringidos.
  u.password        = PASSWORD_E2E unless u.persisted? && u.valid_password?(PASSWORD_E2E)
  u.save!
  u
end

rol_ingeniero = rol_e2e!("Ingeniero E2E", ROLES_E2E["Ingeniero E2E"], admin)
rol_limitado  = rol_e2e!("Limitado E2E",  ROLES_E2E["Limitado E2E"],  admin)
rol_contable  = rol_e2e!("Contable E2E",  ROLES_E2E["Contable E2E"],  admin)

usuarios_e2e = {
  "owner"           => usuario,
  "benef_a"         => usuario_e2e!(email: "e2e-a@controlmatica.test", names: "Ana E2E", last_names: "Beneficiaria",
                                    rol: rol_ingeniero, documento: 100_000_601),
  "benef_b"         => usuario_e2e!(email: "e2e-b@controlmatica.test", names: "Bruno E2E", last_names: "Beneficiario",
                                    rol: rol_ingeniero, documento: 100_000_602),
  "benef_c"         => usuario_e2e!(email: "e2e-c@controlmatica.test", names: "Carla E2E", last_names: "Beneficiaria",
                                    rol: rol_ingeniero, documento: 100_000_603),
  "restringido"     => usuario_e2e!(email: "e2e-limitado@controlmatica.test", names: "Limitado E2E", last_names: "Restringido",
                                    rol: rol_limitado, documento: 100_000_604),
  "contab_limitado" => usuario_e2e!(email: "e2e-contab@controlmatica.test", names: "Contable E2E", last_names: "Limitado",
                                    rol: rol_contable, documento: 100_000_605)
}

# --- 10. Centros de costo de la suite funcional --------------------------
#
# find_or_create_by!(code: ...) NO FUNCIONA: `before_create :create_code`
# sobrescribe el code que se le pase. El update_column posterior salta callbacks
# y validaciones a proposito.
def upsert_center!(code:, viatic:, owner:, customer:, admin:)
  cc = CostCenter.find_by(code: code)

  if cc.nil?
    cc = CostCenter.create!(
      customer_id: customer.id, user_id: admin.id, user_owner_id: owner.id,
      description: "Centro E2E #{code}",
      start_date: Date.new(2026, 1, 15), end_date: Date.new(2026, 12, 31),
      execution_state: "EN EJECUCION", service_type: "PROYECTO",
      quotation_number: "COT-#{code}", viatic_value: viatic,
      engineering_value: 20_000_000.0, eng_hours: 100.0,
      hour_real: 50_000.0, hour_cotizada: 80_000.0,
      hours_contractor: 0.0, hours_contractor_real: 0.0, hours_contractor_invoices: 0.0
    )
    cc.update_column(:code, code)
  end

  cc.update_columns(viatic_value: viatic, user_owner_id: owner.id)
  cc.reload
end

centros_e2e = SCOPES_ACTIVOS.each_with_object({}) do |slug, acc|
  cfg = E2E_SCOPES[slug]
  # Excepcion deliberada: el centro de PERM pertenece a benef_a y NO al usuario
  # restringido. El escenario 8 debe probar que ni siquiera se ve la pestana, no
  # que la ve pero vacia.
  dueno = slug == "PERM" ? usuarios_e2e["benef_a"] : usuario
  acc[slug] = upsert_center!(code: cfg[:code], viatic: cfg[:viatic], owner: dueno,
                             customer: cliente, admin: admin)
end

# --- 11. Reset transaccional ACOTADO -------------------------------------
#
# `destroy` y no `delete_all` en gastos porque create_destroy_register debe
# correr: si revienta, el seed falla ruidosamente en vez de dejar basura.
# `delete_all` en partidas porque no hay nada que auditar de un dato de prueba y
# reevaluate_center_user! sobre un centro que estamos por recrear es trabajo
# perdido.
ids_centros = centros_e2e.values.map(&:id)

unless ids_centros.empty?
  ReportExpense.where(cost_center_id: ids_centros).find_each(&:destroy)
  ExpenseBudget.where(cost_center_id: ids_centros).delete_all
end

# Las tasas se limpian SIEMPRE que corra el scope FX: si quedara la fila
# cacheada de una corrida anterior, ExchangeRateService cortaria en el paso 1 y
# el stub de red no se ejercitaria, que es justo lo que currency.spec.js afirma.
ExchangeRate.where(currency: %w[USD EUR]).delete_all if centros_e2e.key?("FX")

# Las reglas que crea rules.spec.js por la UI llevan el prefijo "E2E " en el
# nombre. `destroy_all` y no `delete_all`: hay que soltar las filas de
# expense_rules_users y dejar el registro de auditoria.
ExpenseRule.where("name LIKE 'E2E %'").destroy_all if centros_e2e.key?("RULE")

# --- 12. Datos por escenario ---------------------------------------------
partidas_e2e = {}
gastos_e2e   = {}

def gasto_e2e!(centro:, responsable:, numero:, nombre:, valor:, fecha:, tipo:, pago:, iva: 0.0)
  ReportExpense.create!(
    # El comprobante es obligatorio desde 2026-09-10, pero la siembra no puede
    # adjuntar archivos: varios escenarios E2E (el 4, sin ir mas lejos) existen
    # justamente para subirlo POR LA UI, y sembrarlo ya adjunto haria que esos
    # tests no probaran nada. Misma excepcion declarada que la del import.
    omitir_comprobante_obligatorio: true,
    user_id: responsable.id, user_invoice_id: responsable.id, cost_center_id: centro.id,
    invoice_name: nombre, invoice_date: fecha,
    description: "Gasto semilla determinista para E2E",
    invoice_number: numero, invoice_type: "Factura", identification: "900999888",
    type_identification_id: tipo.id, payment_type_id: pago.id,
    invoice_value: valor, invoice_tax: iva, invoice_total: valor + iva
  )
end

# BUD: cero partidas y cero gastos. El escenario 1 las crea POR LA UI; sembrarlas
# haria que el test no probara el formulario.

if centros_e2e["REC"]
  partidas_e2e["REC"] = ExpenseBudget.create!(
    cost_center_id: centros_e2e["REC"].id, user_id: usuario.id, amount: 2_000_000.0,
    notes: "Partida E2E comprobantes", active: true, created_by_id: admin.id
  )
  # SIN receipt_file a proposito: el escenario 4 lo adjunta por la UI.
  gastos_e2e["REC_001"] = gasto_e2e!(centro: centros_e2e["REC"], responsable: usuario,
                                     numero: "FE-E2E-REC-001", nombre: "Taxi E2E semilla",
                                     valor: 50_000.0, iva: 9_500.0,
                                     fecha: Date.new(2026, 6, 15), tipo: tipo, pago: pago).id
end

if centros_e2e["FX"]
  partidas_e2e["FX"] = ExpenseBudget.create!(
    cost_center_id: centros_e2e["FX"].id, user_id: usuario.id, amount: 9_000_000.0,
    notes: "Partida E2E moneda extranjera", active: true, created_by_id: admin.id
  )
end

if centros_e2e["ACC"]
  partidas_e2e["ACC"] = ExpenseBudget.create!(
    cost_center_id: centros_e2e["ACC"].id, user_id: usuario.id, amount: 1_000_000.0,
    notes: "Partida E2E contabilidad", active: true, created_by_id: admin.id
  )

  acc_ids = []
  (1..12).each do |n|
    valor = n == 12 ? 1_200_000.0 : 100_000.0
    g = gasto_e2e!(centro: centros_e2e["ACC"], responsable: usuario,
                   numero: format("FE-E2E-ACC-%03d", n), nombre: "Gasto contable #{n}",
                   valor: valor, fecha: Date.new(2026, 6, 1) + (n - 1),
                   tipo: tipo, pago: pago)

    # UNICA excepcion del proyecto a "el estado presupuestal lo escribe el
    # servicio", y va con update_column por dos razones concretas:
    #   1. `budget_status` no esta en los strong params, asi que un `update`
    #      normal no lo escribiria;
    #   2. persist_with_evaluation! lo RECALCULARIA y los 12 quedarian en
    #      "sin_presupuesto", con lo que E7.1 afirmaria total 12 en vez de 11.
    # La bandeja de contabilidad debe recibir exactamente 8 aprobados,
    # 3 sin_presupuesto y 1 excedido.
    estado = if n <= 8 then "aprobado"
             elsif n <= 11 then "sin_presupuesto"
             else "excedido"
             end
    g.update_column(:budget_status, estado)
    g.update_column(:budget_reason, "Excede el presupuesto disponible en $200.000") if estado == "excedido"
    # LOS 12 ACEPTADOS OPERATIVAMENTE, no la mitad. `n.even?` dejaba 6, y como
    # `AccountingExpensesController#filtered_scope` solo deja pasar los aceptados,
    # la bandeja traia 5 o 6 filas mientras los specs del escenario 7 afirmaban
    # 11 y seleccionaban 10: nunca pudieron pasar. Nada mas en la suite depende de
    # que estos gastos alternen de estado (es el unico uso en todo el repo).
    g.update_column(:is_acepted, true)

    acc_ids << g.id
  end
  gastos_e2e["ACC"] = acc_ids
  gastos_e2e["ACC_EXCEDIDO"] = acc_ids.last
end

if centros_e2e["PERM"]
  partidas_e2e["PERM"] = ExpenseBudget.create!(
    cost_center_id: centros_e2e["PERM"].id, user_id: usuarios_e2e["benef_a"].id, amount: 400_000.0,
    notes: "Partida E2E permisos", active: true, created_by_id: admin.id
  )
  gastos_e2e["PERM_001"] = gasto_e2e!(centro: centros_e2e["PERM"], responsable: usuarios_e2e["benef_a"],
                                      numero: "FE-E2E-PERM-001", nombre: "Gasto de permisos",
                                      valor: 120_000.0, fecha: Date.new(2026, 6, 10),
                                      tipo: tipo, pago: pago).id
end

if centros_e2e["RULE"]
  # La partida es de Bruno (benef_b) y no del dueño: los escenarios de reglas
  # necesitan un beneficiario que ningun otro spec use para registrar gastos.
  partidas_e2e["RULE"] = ExpenseBudget.create!(
    cost_center_id: centros_e2e["RULE"].id, user_id: usuarios_e2e["benef_b"].id,
    amount: 1_000_000.0, notes: "Partida E2E reglas", active: true, created_by_id: admin.id
  )
end

if centros_e2e["PAG"]
  # 57 y no 50: con per_page = 50 da dos paginas desparejas (50 + 7), que es la
  # unica forma de distinguir "el servidor pagino" de "el cliente corto la
  # lista".
  #
  # `insert_all` esta PROHIBIDO aqui: saltaria after_create
  # :create_create_register y dejaria el sistema en un estado que nunca ocurre
  # en produccion, ademas de ocultar que los callbacks revientan sin
  # User.current.
  gastos_e2e["PAG"] = (1..57).map do |n|
    gasto_e2e!(centro: centros_e2e["PAG"], responsable: usuario,
               numero: format("FE-E2E-PAG-%03d", n), nombre: "Gasto paginado #{n}",
               valor: 10_000.0 + (n * 1_000), fecha: Date.new(2026, 5, 1) + n,
               tipo: tipo, pago: pago).id
  end
end

# --- 13. Exportar test/e2e/.auth/seed-ids.json ---------------------------
#
# Los specs leen los ids de aqui y NUNCA los hardcodean. Si SCOPE != "ALL" se
# FUNDE con el archivo existente, para no borrar los ids de los scopes que no se
# resembraron en esta corrida.
ruta_ids = Rails.root.join("test", "e2e", ".auth", "seed-ids.json")
FileUtils.mkdir_p(ruta_ids.dirname)

previo = begin
  ruta_ids.exist? ? JSON.parse(ruta_ids.read) : {}
rescue JSON::ParserError
  {}
end

nuevo = {
  "generated_at" => Time.current.iso8601,
  "scope" => SCOPE,
  "users" => usuarios_e2e.transform_values(&:id),
  "cost_centers" => centros_e2e.transform_values(&:id).merge("SMOKE" => centro.id),
  "budgets" => partidas_e2e.transform_values(&:id),
  "expenses" => gastos_e2e
}

payload = previo.deep_merge(nuevo)
File.write(ruta_ids, JSON.pretty_generate(payload))

# --- 14. Resumen ----------------------------------------------------------
# globalSetup lo vuelca al log de Playwright; sirve para depurar sin abrir psql.
puts "== seed E2E =="
puts "  entorno:  #{Rails.env}"
puts "  admin:    #{admin.email} (id=#{admin.id})"
puts "  usuario:  #{usuario.email} (id=#{usuario.id})"
puts "  cliente:  #{cliente.name} (id=#{cliente.id})"
puts "  centro:   #{centro.reload.code} (id=#{centro.id}) viaticos=#{centro.viatic_value}"
puts "  gastos:   #{gastos.map { |g| "#{g.invoice_number}##{g.id}" }.join(", ")}"
puts "  modulos:  #{ModuleControl.count}, acciones: #{AccionModule.count}, permisos admin: #{rol_admin.reload.accion_modules.count}"
puts "  scope:    #{SCOPE} -> #{SCOPES_ACTIVOS.join(', ').presence || '(solo smoke)'}"
puts "  centros:  #{centros_e2e.map { |k, v| "#{k}##{v.id}" }.join(', ')}"
puts "  usuarios: #{usuarios_e2e.map { |k, v| "#{k}##{v.id}" }.join(', ')}"
puts "  partidas: #{partidas_e2e.map { |k, v| "#{k}##{v.id}" }.join(', ')}"
puts "  gastos:   ACC=#{Array(gastos_e2e['ACC']).size}, PAG=#{Array(gastos_e2e['PAG']).size}"
puts "  ids:      #{ruta_ids}"
puts "== fin seed E2E =="
