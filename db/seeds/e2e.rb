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

# --- 2. Modulos, acciones y permisos del rol Administrador ---------------
# "Reportes de servicios" y "Tablero de Ingenieros" NO son opcionales:
# after_sign_in_path_for hace .id sobre ModuleControl.find_by_name sin guarda de
# nil, y el login por formulario es exactamente lo que hace auth.setup.js.
MODULOS = {
  "Gastos" => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Aceptar gasto",
               "Exportar a excel", "Ver todos", "Cambiar responsable"],
  "Centro de Costos" => ["Ingreso al modulo", "Editar"],
  "Presupuesto" => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"],
  "Contabilidad" => ["Ingreso al modulo", "Aprobar", "Exportar a excel", "Ver todos"],
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

# --- 4. Usuario E2E ------------------------------------------------------
# find_or_initialize + asignar password SIEMPRE, para que un cambio en
# test/e2e/support/env.js se propague sin tener que borrar la BD a mano.
usuario = User.find_or_initialize_by(email: EMAIL_E2E)
usuario.names           = "Ingeniero"
usuario.last_names      = "E2E"
usuario.rol_id          = rol_admin.id
usuario.document_type   = "CC"
usuario.number_document = 100_000_500
usuario.menu            = "nav-sm"
usuario.password        = PASSWORD_E2E
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

# --- 9. Resumen ----------------------------------------------------------
# globalSetup lo vuelca al log de Playwright; sirve para depurar sin abrir psql.
puts "== seed E2E =="
puts "  entorno:  #{Rails.env}"
puts "  admin:    #{admin.email} (id=#{admin.id})"
puts "  usuario:  #{usuario.email} (id=#{usuario.id})"
puts "  cliente:  #{cliente.name} (id=#{cliente.id})"
puts "  centro:   #{centro.reload.code} (id=#{centro.id}) viaticos=#{centro.viatic_value}"
puts "  gastos:   #{gastos.map { |g| "#{g.invoice_number}##{g.id}" }.join(", ")}"
puts "  modulos:  #{ModuleControl.count}, acciones: #{AccionModule.count}, permisos admin: #{rol_admin.reload.accion_modules.count}"
puts "== fin seed E2E =="
