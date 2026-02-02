# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

# ============================================
# Seed: 1000 Clientes de prueba
# Ejecutar: rails db:seed
# ============================================

empresas = [
  "Soluciones", "Industrias", "Grupo", "Servicios", "Tecnología",
  "Ingeniería", "Construcciones", "Automatización", "Control", "Proyectos",
  "Logística", "Equipos", "Mantenimiento", "Sistemas", "Energía",
  "Distribuciones", "Comercial", "Inversiones", "Suministros", "Gestión"
]

sufijos = [
  "S.A.S", "S.A", "Ltda", "& Cía", "S.A.S", "Colombia",
  "del Norte", "del Sur", "Andina", "Nacional", "Internacional"
]

nombres = [
  "López", "García", "Rodríguez", "Martínez", "González",
  "Hernández", "Ramírez", "Torres", "Díaz", "Morales",
  "Vargas", "Castillo", "Rojas", "Méndez", "Restrepo",
  "Ospina", "Cardona", "Ríos", "Suárez", "Montoya"
]

ciudades = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena",
  "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Neiva"
]

calles = ["Cra", "Cll", "Av", "Diagonal", "Transversal"]

dominios = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "empresa.co"]

puts "Creando 1000 clientes de prueba..."

customers = []
1000.times do |i|
  nombre_empresa = "#{empresas.sample} #{nombres.sample} #{sufijos.sample}"
  code = "CLI#{(i + 1).to_s.rjust(4, '0')}"
  ciudad = ciudades.sample
  calle = "#{calles.sample} #{rand(1..150)} # #{rand(1..99)}-#{rand(10..99)}, #{ciudad}"
  nit = "#{rand(800_000_000..999_999_999)}-#{rand(0..9)}"
  telefono = "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}"
  email_base = nombre_empresa.downcase.gsub(/[^a-z0-9]/, '').slice(0, 15)
  email = "#{email_base}#{i + 1}@#{dominios.sample}"
  web = "www.#{email_base}.com.co"

  customers << {
    name: nombre_empresa,
    code: code,
    phone: telefono,
    address: calle,
    nit: nit,
    web: web,
    email: email,
    user_id: 1,
    created_at: Time.now - rand(0..730).days,
    updated_at: Time.now
  }
end

Customer.insert_all(customers)
puts "✓ #{Customer.count} clientes creados."

# ============================================
# Seed: Proveedores
# ============================================

tipos_proveedor = [
  "Eléctricos", "Mecánicos", "Hidráulicos", "Neumáticos", "Instrumentación",
  "Automatización", "Ferretería", "Cables", "Tubería", "Soldadura",
  "Pinturas", "Seguridad Industrial", "Herramientas", "Repuestos", "Lubricantes"
]

puts "Creando 50 proveedores..."

proveedores = []
50.times do |i|
  tipo = tipos_proveedor.sample
  nombre = "#{tipo} #{nombres.sample} #{sufijos.sample}"
  nit = "#{rand(800_000_000..999_999_999)}-#{rand(0..9)}"
  telefono = "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}"
  ciudad = ciudades.sample
  calle = "#{calles.sample} #{rand(1..150)} # #{rand(1..99)}-#{rand(10..99)}, #{ciudad}"
  email_base = nombre.downcase.gsub(/[^a-z0-9]/, '').slice(0, 15)

  proveedores << {
    name: nombre,
    phone: telefono,
    address: calle,
    nit: nit,
    web: "www.#{email_base}.com",
    email: "#{email_base}#{i + 1}@#{dominios.sample}",
    user_id: 1,
    created_at: Time.now - rand(0..365).days,
    updated_at: Time.now
  }
end

Provider.insert_all(proveedores)
puts "✓ #{Provider.count} proveedores creados."

# ============================================
# Seed: Contactos (3 por cada 200 primeros clientes)
# ============================================

puts "Creando contactos..."

cargos = ["Gerente", "Director Técnico", "Jefe de Compras", "Coordinador", "Ingeniero de Planta", "Supervisor"]
nombres_contacto = [
  "Carlos", "María", "Juan", "Ana", "Pedro", "Laura", "Diego", "Camila",
  "Andrés", "Valentina", "Santiago", "Daniela", "Nicolás", "Sofía", "Mateo"
]

contactos = []
Customer.limit(200).pluck(:id).each do |cid|
  rand(1..3).times do |j|
    nom = "#{nombres_contacto.sample} #{nombres.sample}"
    contactos << {
      name: nom,
      email: "#{nom.downcase.gsub(/[^a-z]/, '')}@#{dominios.sample}",
      phone: "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}",
      position: cargos.sample,
      customer_id: cid,
      user_id: 1,
      created_at: Time.now - rand(0..365).days,
      updated_at: Time.now
    }
  end
end

Contact.insert_all(contactos)
puts "✓ #{Contact.count} contactos creados."

# ============================================
# Seed: Centros de Costo
# ============================================

puts "Creando 300 centros de costo..."

service_types = ["SERVICIO", "VENTA", "PROYECTO"]
execution_states = ["EN EJECUCION", "FINALIZADO", "EN EJECUCION", "EN EJECUCION"]
invoiced_states = ["SIN FACTURAR", "PARCIAL", "FACTURADO", "SIN FACTURAR", "SIN FACTURAR"]

customer_ids = Customer.limit(200).pluck(:id)
contact_ids = Contact.pluck(:id)
user_id = 1

centros = []
300.times do |i|
  cust_id = customer_ids.sample
  tipo = service_types.sample
  quot_value = rand(5_000_000..200_000_000).to_f
  eng_hours = rand(10..500).to_f
  mat_value = rand(1_000_000..50_000_000).to_f

  centros << {
    code: "CC-#{(i + 1).to_s.rjust(4, '0')}",
    customer_id: cust_id,
    contact_id: contact_ids.sample,
    description: "Centro de costo #{tipo.downcase} ##{i + 1}",
    start_date: Date.today - rand(30..730),
    end_date: Date.today + rand(30..365),
    service_type: tipo,
    execution_state: execution_states.sample,
    invoiced_state: invoiced_states.sample,
    quotation_number: "COT-#{rand(1000..9999)}",
    quotation_value: quot_value,
    engineering_value: quot_value * 0.3,
    viatic_value: rand(500_000..5_000_000).to_f,
    eng_hours: eng_hours,
    hour_cotizada: eng_hours,
    hour_real: 0,
    materials_value: mat_value,
    work_force_contractor: rand(1_000_000..20_000_000).to_f,
    hours_contractor: rand(10..300).to_f,
    hours_contractor_real: 0,
    displacement_hours: rand(5..50).to_f,
    offset_value: rand(100_000..2_000_000).to_f,
    aiu: rand(0.05..0.20).round(2),
    user_id: user_id,
    user_owner_id: user_id,
    count: 0,
    created_at: Time.now - rand(0..365).days,
    updated_at: Time.now
  }
end

CostCenter.insert_all(centros)
puts "✓ #{CostCenter.count} centros de costo creados."

# ============================================
# Seed: Tipos de Gastos (ReportExpenseOption)
# ============================================

puts "Creando tipos de gastos..."

expense_types = [
  { name: "Transporte terrestre", category: "Tipo" },
  { name: "Transporte aéreo", category: "Tipo" },
  { name: "Hospedaje", category: "Tipo" },
  { name: "Alimentación", category: "Tipo" },
  { name: "Peajes", category: "Tipo" },
  { name: "Combustible", category: "Tipo" },
  { name: "Parqueadero", category: "Tipo" },
  { name: "Papelería", category: "Tipo" },
  { name: "Herramientas", category: "Tipo" },
  { name: "EPP", category: "Tipo" },
  { name: "Efectivo", category: "Medio de pago" },
  { name: "Tarjeta débito", category: "Medio de pago" },
  { name: "Tarjeta crédito", category: "Medio de pago" },
  { name: "Transferencia", category: "Medio de pago" },
  { name: "Caja menor", category: "Medio de pago" },
]

expense_records = expense_types.map do |et|
  et.merge(user_id: 1, created_at: Time.now, updated_at: Time.now)
end

ReportExpenseOption.insert_all(expense_records)
puts "✓ #{ReportExpenseOption.count} tipos de gastos creados."

# ============================================
# Seed: Ordenes de Compra (SalesOrder)
# ============================================

puts "Creando 500 ordenes de compra..."

cost_center_ids = CostCenter.pluck(:id)

ordenes = []
500.times do |i|
  valor = rand(500_000..50_000_000).to_f
  created = Date.today - rand(0..365)

  ordenes << {
    created_date: created,
    order_number: "OC-#{rand(10000..99999)}",
    order_value: valor,
    sum_invoices: (valor * rand(0.0..1.0)).round(0),
    state: ["Pendiente", "Parcial", "Facturado"].sample,
    description: ["Compra de materiales eléctricos", "Suministro de cables", "Repuestos mecánicos",
                   "Equipos de instrumentación", "Herramientas especiales", "Elementos de seguridad",
                   "Tubería y accesorios", "Componentes neumáticos", "Equipos de soldadura",
                   "Material de automatización"].sample,
    cost_center_id: cost_center_ids.sample,
    user_id: user_id,
    last_user_edited_id: user_id,
    created_at: created,
    updated_at: Time.now
  }
end

SalesOrder.insert_all(ordenes)
puts "✓ #{SalesOrder.count} ordenes de compra creadas."

# ============================================
# Seed: Registro Tablerista (Contractor)
# ============================================

puts "Creando 500 registros de tablerista..."

descripciones_contractor = [
  "Cableado de tablero de control", "Montaje de variador de frecuencia",
  "Instalación de PLC", "Ensamble de borneras", "Conexión de relés de protección",
  "Montaje de arrancadores suaves", "Cableado de instrumentación",
  "Instalación de HMI", "Pruebas de tablero", "Cableado de potencia",
  "Marcado de cables", "Montaje de canaletas", "Instalación de ventiladores",
  "Pruebas FAT", "Conexión de transformadores de corriente"
]

user_ids = User.pluck(:id)
user_ids = [1] if user_ids.empty?

contractors = []
500.times do |i|
  fecha = Date.today - rand(0..365)
  horas = rand(1..12).to_f
  ejecutor = user_ids.sample

  contractors << {
    sales_date: fecha,
    hours: horas,
    ammount: horas * rand(25_000..60_000),
    description: descripciones_contractor.sample,
    cost_center_id: cost_center_ids.sample,
    user_id: user_id,
    user_execute_id: ejecutor,
    last_user_edited_id: user_id,
    created_at: fecha,
    updated_at: Time.now
  }
end

Contractor.insert_all(contractors)
puts "✓ #{Contractor.count} registros de tablerista creados."

# ============================================
# Seed: Materiales (Material)
# ============================================

puts "Creando 500 materiales..."

provider_ids = Provider.pluck(:id)
estados_material = ["Pendiente", "Parcial", "Entregado", "Cancelado"]

descripciones_material = [
  "Cable de control 16 AWG", "Interruptor termomagnético 3P 100A",
  "Variador de frecuencia 10HP", "PLC Siemens S7-1200", "Sensor de presión 4-20mA",
  "Tubería conduit 1\"", "Bornera de conexión 10mm", "Relé de protección 24VDC",
  "Pantalla HMI 7\"", "Transformador de corriente 200/5A",
  "Contactor 3P 40A", "Fusible NH 100A", "Cable de potencia 2/0 AWG",
  "Gabinete metálico 80x60x30", "Canaleta ranurada 60x80"
]

materiales = []
500.times do |i|
  fecha_orden = Date.today - rand(30..365)
  valor = rand(100_000..20_000_000).to_f
  estado = estados_material.sample

  materiales << {
    provider_id: provider_ids.sample,
    sales_date: fecha_orden,
    sales_number: "MAT-#{rand(10000..99999)}",
    amount: valor,
    delivery_date: fecha_orden + rand(5..60),
    sales_state: estado,
    description: descripciones_material.sample,
    provider_invoice_number: estado == "Entregado" ? "FAC-#{rand(1000..9999)}" : nil,
    provider_invoice_value: estado == "Entregado" ? valor : 0,
    cost_center_id: cost_center_ids.sample,
    user_id: user_id,
    last_user_edited_id: user_id,
    created_at: fecha_orden,
    updated_at: Time.now
  }
end

Material.insert_all(materiales)
puts "✓ #{Material.count} materiales creados."

# ============================================
# Seed: Reportes de Servicio (Report)
# ============================================

puts "Creando 500 reportes de servicio..."

descripciones_reporte = [
  "Mantenimiento preventivo de tablero de control",
  "Diagnóstico de falla en variador de frecuencia",
  "Programación de PLC para secuencia de arranque",
  "Calibración de instrumentos de presión y temperatura",
  "Instalación de sistema SCADA",
  "Puesta en marcha de sistema de bombeo",
  "Revisión de protecciones eléctricas",
  "Soporte técnico en parada de planta",
  "Configuración de red de comunicación industrial",
  "Actualización de firmware de controladores",
  "Montaje de tablero de distribución",
  "Pruebas de aislamiento en motores",
  "Comisionamiento de subestación eléctrica",
  "Mantenimiento correctivo de sistema de ventilación",
  "Asesoría técnica en automatización de procesos"
]

customer_with_contacts = Contact.pluck(:customer_id).uniq
report_customer_ids = customer_with_contacts.any? ? customer_with_contacts : customer_ids

reportes = []
500.times do |i|
  fecha = Date.today - rand(0..365)
  cust_id = report_customer_ids.sample
  cont = Contact.where(customer_id: cust_id).first
  cc_id = cost_center_ids.sample
  horas_trabajo = rand(1..16).to_f
  horas_desp = rand(0..8).to_f
  valor_hora = rand(40_000..120_000)
  working_value = horas_trabajo * valor_hora
  viatic = [0, 0, rand(50_000..500_000).to_f].sample
  desp_value = horas_desp * rand(20_000..50_000)
  total = working_value + viatic + desp_value
  ejecutor = user_ids.sample

  reportes << {
    report_date: fecha,
    code_report: "REP-#{(i + 1).to_s.rjust(5, '0')}",
    customer_id: cust_id,
    customer_name: Customer.find_by(id: cust_id)&.name || "Cliente",
    contact_id: cont ? cont.id : nil,
    contact_name: cont ? cont.name : "",
    contact_email: cont ? cont.email : "",
    contact_phone: cont ? cont.phone : "",
    contact_position: cont ? cont.position : "",
    cost_center_id: cc_id,
    user_id: user_id,
    report_execute_id: ejecutor,
    working_time: horas_trabajo,
    working_value: working_value,
    work_description: descripciones_reporte.sample,
    displacement_hours: horas_desp,
    value_displacement_hours: desp_value,
    viatic_value: viatic,
    viatic_description: viatic > 0 ? "Viáticos de desplazamiento" : "",
    total_value: total,
    report_sate: [true, false].sample,
    count: i + 1,
    last_user_edited_id: user_id,
    created_at: fecha,
    updated_at: Time.now
  }
end

Report.insert_all(reportes)
puts "✓ #{Report.count} reportes creados."

puts ""
puts "========================================"
puts " Seed completado"
puts "========================================"
puts " Clientes:       #{Customer.count}"
puts " Proveedores:    #{Provider.count}"
puts " Contactos:      #{Contact.count}"
puts " Centros Costo:  #{CostCenter.count}"
puts " Tipos Gastos:   #{ReportExpenseOption.count}"
puts " Ordenes Compra: #{SalesOrder.count}"
puts " Tableristas:    #{Contractor.count}"
puts " Materiales:     #{Material.count}"
puts " Reportes:       #{Report.count}"
puts "========================================"
