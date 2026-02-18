# ============================================
# SEEDS PARA STAGING - Datos masivos de prueba
# Ejecutar: rails runner db/seeds_staging.rb
# ============================================

require 'securerandom'

puts "============================================"
puts " CREANDO DATOS MASIVOS PARA STAGING"
puts "============================================"
puts ""

# ============================================
# Datos base para generación
# ============================================

empresas = [
  "Soluciones", "Industrias", "Grupo", "Servicios", "Tecnología",
  "Ingeniería", "Construcciones", "Automatización", "Control", "Proyectos",
  "Logística", "Equipos", "Mantenimiento", "Sistemas", "Energía",
  "Distribuciones", "Comercial", "Inversiones", "Suministros", "Gestión",
  "Desarrollos", "Integraciones", "Consultores", "Asesores", "Técnicos"
]

sufijos = [
  "S.A.S", "S.A", "Ltda", "& Cía", "Colombia",
  "del Norte", "del Sur", "Andina", "Nacional", "Internacional",
  "Global", "Partners", "Corp", "Group", "Holdings"
]

nombres = [
  "López", "García", "Rodríguez", "Martínez", "González",
  "Hernández", "Ramírez", "Torres", "Díaz", "Morales",
  "Vargas", "Castillo", "Rojas", "Méndez", "Restrepo",
  "Ospina", "Cardona", "Ríos", "Suárez", "Montoya",
  "Pérez", "Sánchez", "Romero", "Ruiz", "Álvarez"
]

ciudades = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena",
  "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Neiva",
  "Santa Marta", "Villavicencio", "Pasto", "Cúcuta", "Armenia"
]

calles = ["Cra", "Cll", "Av", "Diagonal", "Transversal"]
dominios = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "empresa.co", "corporativo.com"]

nombres_contacto = [
  "Carlos", "María", "Juan", "Ana", "Pedro", "Laura", "Diego", "Camila",
  "Andrés", "Valentina", "Santiago", "Daniela", "Nicolás", "Sofía", "Mateo",
  "Isabella", "Sebastián", "Mariana", "Miguel", "Luciana", "David", "Paula"
]

cargos = [
  "Gerente General", "Director Técnico", "Jefe de Compras", "Coordinador de Proyectos",
  "Ingeniero de Planta", "Supervisor de Operaciones", "Director Comercial",
  "Gerente de Operaciones", "Jefe de Mantenimiento", "Coordinador de Logística"
]

tipos_proveedor = [
  "Eléctricos", "Mecánicos", "Hidráulicos", "Neumáticos", "Instrumentación",
  "Automatización", "Ferretería", "Cables", "Tubería", "Soldadura",
  "Pinturas", "Seguridad Industrial", "Herramientas", "Repuestos", "Lubricantes"
]

service_types = ["SERVICIO", "VENTA", "PROYECTO"]
execution_states = ["EN EJECUCION", "FINALIZADO", "PAUSADO", "EN EJECUCION", "EN EJECUCION"]
invoiced_states = ["SIN FACTURAR", "PARCIAL", "FACTURADO", "SIN FACTURAR", "SIN FACTURAR"]

descripciones_contractor = [
  "Cableado de tablero de control", "Montaje de variador de frecuencia",
  "Instalación de PLC", "Ensamble de borneras", "Conexión de relés de protección",
  "Montaje de arrancadores suaves", "Cableado de instrumentación",
  "Instalación de HMI", "Pruebas de tablero", "Cableado de potencia",
  "Marcado de cables", "Montaje de canaletas", "Instalación de ventiladores",
  "Pruebas FAT", "Conexión de transformadores de corriente"
]

descripciones_material = [
  "Cable de control 16 AWG", "Interruptor termomagnético 3P 100A",
  "Variador de frecuencia 10HP", "PLC Siemens S7-1200", "Sensor de presión 4-20mA",
  "Tubería conduit 1\"", "Bornera de conexión 10mm", "Relé de protección 24VDC",
  "Pantalla HMI 7\"", "Transformador de corriente 200/5A",
  "Contactor 3P 40A", "Fusible NH 100A", "Cable de potencia 2/0 AWG",
  "Gabinete metálico 80x60x30", "Canaleta ranurada 60x80",
  "Breaker 3P 250A", "Relé térmico 40-65A", "Pulsador metálico 22mm",
  "Luz piloto LED 24V", "Selector 3 posiciones"
]

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

user_id = 1

# ============================================
# 1. ROLES (si no existen)
# ============================================

puts "Verificando roles..."
roles_data = [
  { name: "ADMINISTRADOR", user_id: user_id },
  { name: "INGENIERO", user_id: user_id },
  { name: "TABLERISTA", user_id: user_id },
  { name: "COMERCIAL", user_id: user_id },
  { name: "SUPERVISOR", user_id: user_id }
]

roles_data.each do |role|
  Rol.find_or_create_by!(name: role[:name]) do |r|
    r.user_id = role[:user_id]
  end
end
puts "✓ #{Rol.count} roles disponibles"

# ============================================
# 2. USUARIOS (si no hay suficientes)
# ============================================

puts "Verificando usuarios..."
if User.count < 20
  rol_ids = Rol.pluck(:id)
  20.times do |i|
    email = "usuario#{i + 1}@controlmatica.com"
    unless User.exists?(email: email)
      User.create!(
        email: email,
        password: "password123",
        password_confirmation: "password123",
        names: "#{nombres_contacto.sample} #{nombres.sample}",
        rol_id: rol_ids.sample,
        document_type: "Cédula de Ciudadanía",
        number_document: "#{rand(10_000_000..99_999_999)}"
      )
    end
  end
end
user_ids = User.pluck(:id)
puts "✓ #{User.count} usuarios disponibles"

# ============================================
# 3. CLIENTES - 3000
# ============================================

puts "Creando 3000 clientes..."

existing_customers = Customer.count
if existing_customers < 3000
  customers = []
  (3000 - existing_customers).times do |i|
    idx = existing_customers + i + 1
    nombre_empresa = "#{empresas.sample} #{nombres.sample} #{sufijos.sample}"
    code = "CLI#{idx.to_s.rjust(5, '0')}"
    ciudad = ciudades.sample
    calle = "#{calles.sample} #{rand(1..150)} # #{rand(1..99)}-#{rand(10..99)}, #{ciudad}"
    nit = "#{rand(800_000_000..999_999_999)}-#{rand(0..9)}"
    telefono = "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}"
    email_base = nombre_empresa.downcase.gsub(/[^a-z0-9]/, '').slice(0, 15)

    customers << {
      name: nombre_empresa,
      code: code,
      phone: telefono,
      address: calle,
      nit: nit,
      web: "www.#{email_base}.com.co",
      email: "#{email_base}#{idx}@#{dominios.sample}",
      user_id: user_id,
      created_at: Time.now - rand(0..730).days,
      updated_at: Time.now
    }
  end
  Customer.insert_all(customers) if customers.any?
end
puts "✓ #{Customer.count} clientes"

# ============================================
# 4. PROVEEDORES - 200
# ============================================

puts "Creando 200 proveedores..."

existing_providers = Provider.count
if existing_providers < 200
  proveedores = []
  (200 - existing_providers).times do |i|
    idx = existing_providers + i + 1
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
      email: "#{email_base}#{idx}@#{dominios.sample}",
      user_id: user_id,
      created_at: Time.now - rand(0..365).days,
      updated_at: Time.now
    }
  end
  Provider.insert_all(proveedores) if proveedores.any?
end
puts "✓ #{Provider.count} proveedores"

# ============================================
# 5. CONTACTOS - 5000
# ============================================

puts "Creando 5000 contactos..."

customer_ids = Customer.pluck(:id)
existing_contacts = Contact.count

if existing_contacts < 5000
  contactos = []
  customers_sample = customer_ids.sample(2000)

  customers_sample.each do |cid|
    rand(1..3).times do
      break if contactos.size >= (5000 - existing_contacts)
      nom = "#{nombres_contacto.sample} #{nombres.sample}"
      contactos << {
        name: nom,
        email: "#{nom.downcase.gsub(/[^a-z]/, '')}#{rand(1..999)}@#{dominios.sample}",
        phone: "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}",
        position: cargos.sample,
        customer_id: cid,
        user_id: user_id,
        created_at: Time.now - rand(0..365).days,
        updated_at: Time.now
      }
    end
  end
  Contact.insert_all(contactos) if contactos.any?
end
puts "✓ #{Contact.count} contactos"

# ============================================
# 6. TIPOS DE GASTOS (ReportExpenseOption)
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

expense_types.each do |et|
  ReportExpenseOption.find_or_create_by!(name: et[:name]) do |r|
    r.category = et[:category]
    r.user_id = user_id
  end
end
puts "✓ #{ReportExpenseOption.count} tipos de gastos"

# ============================================
# 7. CENTROS DE COSTO - 10,000
# ============================================

puts "Creando 10,000 centros de costo (esto puede tardar)..."

contact_ids = Contact.pluck(:id)
existing_cc = CostCenter.count

if existing_cc < 10000
  batch_size = 1000
  total_to_create = 10000 - existing_cc
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    centros = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      idx = existing_cc + (batch * batch_size) + i + 1
      cust_id = customer_ids.sample
      tipo = service_types.sample
      quot_value = rand(5_000_000..500_000_000).to_f
      eng_hours = rand(10..1000).to_f
      mat_value = rand(1_000_000..100_000_000).to_f
      start_date = Date.today - rand(30..1095)

      centros << {
        code: "CC-#{idx.to_s.rjust(5, '0')}",
        customer_id: cust_id,
        contact_id: contact_ids.sample,
        description: "Centro de costo #{tipo.downcase} ##{idx} - #{empresas.sample}",
        start_date: start_date,
        end_date: start_date + rand(30..730),
        service_type: tipo,
        execution_state: execution_states.sample,
        invoiced_state: invoiced_states.sample,
        quotation_number: "COT-#{rand(10000..99999)}",
        quotation_value: quot_value,
        engineering_value: quot_value * rand(0.2..0.4),
        viatic_value: rand(500_000..10_000_000).to_f,
        eng_hours: eng_hours,
        hour_cotizada: rand(30_000..150_000).to_f,
        hour_real: rand(25_000..140_000).to_f,
        materials_value: mat_value,
        work_force_contractor: rand(1_000_000..50_000_000).to_f,
        hours_contractor: rand(10..500).to_f,
        hours_contractor_invoices: rand(25_000..80_000).to_f,
        hours_contractor_real: rand(20_000..75_000).to_f,
        displacement_hours: rand(5..100).to_f,
        value_displacement_hours: rand(20_000..60_000).to_f,
        offset_value: rand(100_000..5_000_000).to_f,
        aiu: rand(0.05..0.25).round(2),
        user_id: user_id,
        user_owner_id: user_ids.sample,
        count: idx,
        created_at: start_date,
        updated_at: Time.now
      }
    end

    CostCenter.insert_all(centros)
    print "."
  end
  puts ""
end
puts "✓ #{CostCenter.count} centros de costo"

cost_center_ids = CostCenter.pluck(:id)

# ============================================
# 8. ORDENES DE COMPRA - 10,000
# ============================================

puts "Creando 10,000 ordenes de compra..."

existing_orders = SalesOrder.count
if existing_orders < 10000
  batch_size = 2000
  total_to_create = 10000 - existing_orders
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    ordenes = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      valor = rand(500_000..100_000_000).to_f
      created = Date.today - rand(0..730)

      ordenes << {
        created_date: created,
        order_number: "OC-#{rand(100000..999999)}",
        order_value: valor,
        sum_invoices: (valor * rand(0.0..1.0)).round(0),
        state: ["Pendiente", "Parcial", "Facturado"].sample,
        description: ["Compra de materiales eléctricos", "Suministro de cables", "Repuestos mecánicos",
                      "Equipos de instrumentación", "Herramientas especiales", "Elementos de seguridad",
                      "Tubería y accesorios", "Componentes neumáticos", "Equipos de soldadura",
                      "Material de automatización", "Tableros de control", "Variadores de frecuencia"].sample,
        cost_center_id: cost_center_ids.sample,
        user_id: user_id,
        last_user_edited_id: user_ids.sample,
        created_at: created,
        updated_at: Time.now
      }
    end

    SalesOrder.insert_all(ordenes)
    print "."
  end
  puts ""
end
puts "✓ #{SalesOrder.count} ordenes de compra"

# ============================================
# 9. TABLERISTAS (Contractor) - 10,000
# ============================================

puts "Creando 10,000 registros de tablerista..."

existing_contractors = Contractor.count
if existing_contractors < 10000
  batch_size = 2000
  total_to_create = 10000 - existing_contractors
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    contractors = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      fecha = Date.today - rand(0..730)
      horas = rand(1..16).to_f
      ejecutor = user_ids.sample

      contractors << {
        sales_date: fecha,
        hours: horas,
        ammount: horas * rand(25_000..80_000),
        description: descripciones_contractor.sample,
        cost_center_id: cost_center_ids.sample,
        user_id: user_id,
        user_execute_id: ejecutor,
        last_user_edited_id: user_ids.sample,
        created_at: fecha,
        updated_at: Time.now
      }
    end

    Contractor.insert_all(contractors)
    print "."
  end
  puts ""
end
puts "✓ #{Contractor.count} registros de tablerista"

# ============================================
# 10. MATERIALES - 10,000
# ============================================

puts "Creando 10,000 materiales..."

provider_ids = Provider.pluck(:id)
estados_material = ["Pendiente", "Parcial", "Entregado", "Cancelado"]

existing_materials = Material.count
if existing_materials < 10000
  batch_size = 2000
  total_to_create = 10000 - existing_materials
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    materiales = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      fecha_orden = Date.today - rand(30..730)
      valor = rand(100_000..50_000_000).to_f
      estado = estados_material.sample

      materiales << {
        provider_id: provider_ids.sample,
        sales_date: fecha_orden,
        sales_number: "MAT-#{rand(100000..999999)}",
        amount: valor,
        delivery_date: fecha_orden + rand(5..90),
        sales_state: estado,
        description: descripciones_material.sample,
        provider_invoice_number: estado == "Entregado" ? "FAC-#{rand(10000..99999)}" : nil,
        provider_invoice_value: estado == "Entregado" ? valor : 0,
        cost_center_id: cost_center_ids.sample,
        user_id: user_id,
        last_user_edited_id: user_ids.sample,
        created_at: fecha_orden,
        updated_at: Time.now
      }
    end

    Material.insert_all(materiales)
    print "."
  end
  puts ""
end
puts "✓ #{Material.count} materiales"

# ============================================
# 11. REPORTES DE SERVICIO - 10,000
# ============================================

puts "Creando 10,000 reportes de servicio..."

existing_reports = Report.count
if existing_reports < 10000
  batch_size = 2000
  total_to_create = 10000 - existing_reports
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    reportes = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      idx = existing_reports + (batch * batch_size) + i + 1
      fecha = Date.today - rand(0..730)
      cust_id = customer_ids.sample
      cc_id = cost_center_ids.sample
      horas_trabajo = rand(1..16).to_f
      horas_desp = rand(0..8).to_f
      valor_hora = rand(40_000..150_000)
      working_value = horas_trabajo * valor_hora
      viatic = [0, 0, rand(50_000..1_000_000).to_f].sample
      desp_value = horas_desp * rand(20_000..60_000)
      total = working_value + viatic + desp_value
      ejecutor = user_ids.sample

      reportes << {
        report_date: fecha,
        code_report: "REP-#{idx.to_s.rjust(6, '0')}",
        customer_id: cust_id,
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
        count: idx,
        last_user_edited_id: user_ids.sample,
        created_at: fecha,
        updated_at: Time.now
      }
    end

    Report.insert_all(reportes)
    print "."
  end
  puts ""
end
puts "✓ #{Report.count} reportes"

# ============================================
# 11.5 REPORTES DE CLIENTE (CustomerReport) - 2,000
# ============================================

puts "Creando 2,000 reportes de cliente..."

report_states = ["Pendiente", "Enviado al Cliente", "Aprobado"]
contact_ids = Contact.pluck(:id)

existing_customer_reports = CustomerReport.count
if existing_customer_reports < 2000
  (2000 - existing_customer_reports).times do |i|
    cc = CostCenter.where.not(customer_id: nil).order("RANDOM()").first
    next unless cc && cc.customer_id

    customer_contacts = Contact.where(customer_id: cc.customer_id).pluck(:id)
    contact_id = customer_contacts.any? ? customer_contacts.sample : nil

    report_date = Date.today - rand(0..365)
    state = report_states.sample
    approve_date = state == "Aprobado" ? report_date + rand(1..30) : nil

    cr = CustomerReport.new(
      report_date: report_date,
      description: "Informe de servicio realizado para #{cc.description.to_s[0..50]}",
      email: "cliente#{rand(1..100)}@ejemplo.com",
      report_state: state,
      approve_date: approve_date,
      customer_id: cc.customer_id,
      contact_id: contact_id,
      cost_center_id: cc.id,
      user_id: user_ids.sample
    )
    cr.save(validate: false)

    # Asociar algunos reportes al customer_report
    cc_reports = Report.where(cost_center_id: cc.id).limit(rand(1..5)).pluck(:id)
    cc_reports.each do |report_id|
      ActiveRecord::Base.connection.execute(
        "INSERT INTO customer_reports_reports (customer_report_id, report_id) VALUES (#{cr.id}, #{report_id}) ON CONFLICT DO NOTHING"
      ) rescue nil
    end

    print "." if (i + 1) % 200 == 0
  end
  puts ""
end
puts "✓ #{CustomerReport.count} reportes de cliente"

# ============================================
# 12. FACTURAS DE CLIENTE - 5,000
# ============================================

puts "Creando 5,000 facturas de cliente..."

sales_order_ids = SalesOrder.pluck(:id)
customer_invoice_states = ["Pagada", "Pendiente", "Parcial"]

existing_invoices = CustomerInvoice.count
if existing_invoices < 5000
  batch_size = 1000
  total_to_create = 5000 - existing_invoices
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    customer_invoices = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      so_id = sales_order_ids.sample
      so = SalesOrder.find_by(id: so_id)
      next unless so

      valor = rand(5_000_000..100_000_000).to_f
      eng_value = (valor * rand(0.2..0.4)).round(0)

      customer_invoices << {
        number_invoice: "FAC-CLI-#{rand(100000..999999)}",
        invoice_date: Date.today - rand(0..730),
        invoice_value: valor,
        engineering_value: eng_value,
        others_value: valor - eng_value,
        invoice_state: customer_invoice_states.sample,
        delivery_certificate_state: ["Pendiente", "Entregado"].sample,
        reception_report_state: ["Pendiente", "Recibido"].sample,
        cost_center_id: so.cost_center_id,
        sales_order_id: so.id,
        created_at: Time.now - rand(0..730).days,
        updated_at: Time.now
      }
    end

    CustomerInvoice.insert_all(customer_invoices) if customer_invoices.any?
    print "."
  end
  puts ""
end
puts "✓ #{CustomerInvoice.count} facturas de cliente"

# ============================================
# 13. TURNOS (Shift) - 5,000
# ============================================

puts "Creando 5,000 turnos..."

shift_types = ["Trabajo en sitio", "Trabajo remoto", "Soporte técnico", "Mantenimiento", "Instalación", "Capacitación"]
shift_colors = ["#f5a623", "#4caf50", "#2196f3", "#9c27b0", "#ff5722", "#607d8b"]

existing_shifts = Shift.count
if existing_shifts < 5000
  shifts = []
  (5000 - existing_shifts).times do |i|
    fecha_inicio = Date.today - rand(-180..365)

    shifts << {
      subject: "#{shift_types.sample} - #{empresas.sample}",
      description: descripciones_reporte.sample,
      start_date: fecha_inicio,
      end_date: fecha_inicio + rand(0..5),
      color: shift_colors.sample,
      cost_center_id: cost_center_ids.sample,
      user_id: user_id,
      user_responsible_id: user_ids.sample,
      created_at: Time.now - rand(0..365).days,
      updated_at: Time.now
    }
  end
  Shift.insert_all(shifts) if shifts.any?
end
puts "✓ #{Shift.count} turnos"

# ============================================
# 14. REPORTES DE GASTOS - 5,000
# ============================================

puts "Creando 5,000 reportes de gastos..."

existing_expenses = ReportExpense.count
if existing_expenses < 5000
  batch_size = 1000
  total_to_create = 5000 - existing_expenses
  batches = (total_to_create / batch_size.to_f).ceil

  batches.times do |batch|
    expenses = []
    current_batch_size = [batch_size, total_to_create - (batch * batch_size)].min

    current_batch_size.times do |i|
      fecha = Date.today - rand(0..365)
      valor = rand(10_000..2_000_000).to_f
      tax = (valor * 0.19).round(2)

      expenses << {
        invoice_date: fecha,
        invoice_number: "GAS-#{rand(100000..999999)}",
        invoice_name: ["Transportes S.A.", "Hotel Central", "Restaurante El Buen Sabor",
                       "Estación de Servicio", "Ferretería Industrial", "Papelería Moderna"].sample,
        invoice_value: valor,
        invoice_tax: tax,
        invoice_total: valor + tax,
        invoice_type: ["Factura", "Cuenta de cobro", "Recibo"].sample,
        payment_type: ["Efectivo", "Tarjeta", "Transferencia"].sample,
        description: ["Transporte a obra", "Hospedaje en proyecto", "Alimentación equipo",
                      "Peajes autopista", "Combustible vehículo", "Parqueadero",
                      "Papelería oficina", "EPP personal", "Herramientas"].sample,
        cost_center_id: cost_center_ids.sample,
        user_id: user_id,
        is_acepted: [true, false].sample,
        created_at: fecha,
        updated_at: Time.now
      }
    end

    ReportExpense.insert_all(expenses) if expenses.any?
    print "."
  end
  puts ""
end
puts "✓ #{ReportExpense.count} reportes de gastos"

# ============================================
# 15. RELACIONES DE GASTOS - 1,000
# ============================================

puts "Creando 1,000 relaciones de gastos..."

existing_ratios = ExpenseRatio.count
if existing_ratios < 1000
  ratios = []
  (1000 - existing_ratios).times do |i|
    start_dt = Date.today - rand(30..365)
    end_dt = start_dt + rand(7..60)

    ratios << {
      user_report_id: user_ids.sample,
      start_date: start_dt,
      end_date: end_dt,
      creation_date: start_dt - rand(1..7).days,
      area: ["Operaciones", "Administración", "Proyectos", "Ventas", "Mantenimiento"].sample,
      observations: "Relación de gastos período #{start_dt.strftime('%B %Y')}",
      anticipo: [0, rand(100_000..1_000_000).to_f].sample,
      user_id: user_id,
      created_at: Time.now - rand(0..365).days,
      updated_at: Time.now
    }
  end
  ExpenseRatio.insert_all(ratios) if ratios.any?
end
puts "✓ #{ExpenseRatio.count} relaciones de gastos"

# ============================================
# 16. CONFIGURACIÓN DE ALERTAS
# ============================================

puts "Creando configuración de alertas..."

existing_alerts = Alert.count rescue 0
if existing_alerts == 0
  begin
    Alert.create!(
      name: "Configuración General",
      ing_ejecucion_min: 80, ing_ejecucion_med: 100, ing_ejecucion_max: 120,
      ing_costo_min: 80, ing_costo_med: 100, ing_costo_max: 120,
      tab_ejecucion_min: 80, tab_ejecucion_med: 100, tab_ejecucion_max: 120,
      tab_costo_min: 80, tab_costo_med: 100, tab_costo_max: 120,
      desp_min: 80, desp_med: 100, desp_max: 120,
      mat_min: 80, mat_med: 100, mat_max: 120,
      via_min: 80, via_med: 100, via_max: 120,
      total_min: 80, total_med: 100, tatal_max: 120,
      alert_min: 100, alert_med: 150, alert_max: 151,
      color_min: "#d26666", color_mid: "#d4b21e", color_max: "#24bc6b",
      alert_hour_min: 100, alert_hour_med: 100, alert_hour_max: 100,
      color_hour_min: "#d26666", color_hour_med: "#d4b21e", color_hour_max: "#24bc6b",
      user_id: user_id
    )
  rescue => e
    puts "  (Alertas omitidas: #{e.message})"
  end
end
puts "✓ #{Alert.count rescue 0} configuración de alertas"

# ============================================
# RESUMEN FINAL
# ============================================

puts ""
puts "============================================"
puts " SEED STAGING COMPLETADO"
puts "============================================"
puts " Roles:               #{Rol.count}"
puts " Usuarios:            #{User.count}"
puts " Clientes:            #{Customer.count}"
puts " Proveedores:         #{Provider.count}"
puts " Contactos:           #{Contact.count}"
puts " Centros Costo:       #{CostCenter.count}"
puts " Tipos Gastos:        #{ReportExpenseOption.count}"
puts " Ordenes Compra:      #{SalesOrder.count}"
puts " Tableristas:         #{Contractor.count}"
puts " Materiales:          #{Material.count}"
puts " Reportes:            #{Report.count}"
puts " Reportes Cliente:    #{CustomerReport.count}"
puts " Facturas Cliente:    #{CustomerInvoice.count}"
puts " Turnos:              #{Shift.count}"
puts " Reportes Gastos:     #{ReportExpense.count}"
puts " Relaciones Gastos:   #{ExpenseRatio.count}"
puts " Alertas:             #{Alert.count rescue 'N/A'}"
puts "============================================"
puts ""
puts "Para ejecutar en staging:"
puts "  heroku run rails runner db/seeds_staging.rb -a tu-app-staging"
puts ""
