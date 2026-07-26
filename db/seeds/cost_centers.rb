# ============================================
# Seed: 1000 Centros de Costo con dependencias
# Ejecutar: rails runner db/seeds/cost_centers.rb
# ============================================

puts "=" * 60
puts "SEED: Centros de Costo (1000 registros)"
puts "=" * 60

# ─── 1. Parametrizaciones requeridas ───

params_data = {
  "HORA HOMBRE COSTO" => 50_000,
  "HORA HOMBRE COTIZADA" => 80_000,
  "HORA DESPLAZAMIENTO" => 50_000,
}

params_data.each do |name, value|
  Parameterization.find_or_create_by!(name: name) do |p|
    p.money_value = value
  end
end
puts "  Parametrizaciones: OK (#{Parameterization.count})"

# ─── 2. Rol base ───

rol = Rol.find_or_create_by!(name: "Administrador")
puts "  Rol: OK (#{rol.name})"

# ─── 3. Usuario base ───

user = User.find_or_create_by!(email: "seed@controlmatica.com") do |u|
  u.names = "Usuario Seed"
  u.password = "Seed2026!"
  u.password_confirmation = "Seed2026!"
  u.rol = rol
end
puts "  Usuario: OK (#{user.email})"

# ─── 4. Clientes (20 variados) ───

empresas = [
  "Ecopetrol", "ISA", "Celsia", "EPM", "Cementos Argos",
  "Nutresa", "Bancolombia", "Avianca", "Terpel", "Corona",
  "Colpatria", "Sura", "Davivienda", "Alpina", "Postobón",
  "Bavaria", "Bimbo", "Siemens Colombia", "ABB Colombia", "Schneider Electric"
]

prefijos = %w[ECO ISA CEL EPM ARG NUT BAN AVI TER COR COL SUR DAV ALP POS BAV BIM SIE ABB SCH]

customers = empresas.each_with_index.map do |name, i|
  Customer.find_or_create_by!(name: name) do |c|
    c.code = prefijos[i]
    c.nit = "#{rand(800_000_000..999_999_999)}-#{rand(0..9)}"
    c.phone = "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}"
    c.email = "contacto@#{name.downcase.gsub(/[^a-z0-9]/, '')}.com.co"
    c.address = "Cra #{rand(1..100)} # #{rand(1..80)}-#{rand(10..99)}, Bogotá"
    c.user_id = user.id
  end
end
puts "  Clientes: OK (#{customers.size})"

# ─── 5. Contactos (2 por cliente) ───

nombres_contacto = %w[Carlos María Juan Andrea Felipe Laura Santiago Natalia Andrés Camila Diego Valentina Sebastián Daniela Alejandro]
apellidos = %w[López García Rodríguez Martínez González Hernández Ramírez Torres Díaz Morales Vargas Castillo Rojas]
cargos = ["Gerente de Proyectos", "Director Técnico", "Coordinador de Obra", "Ingeniero Residente", "Jefe de Compras", "Director Administrativo", "Supervisor de Campo"]

contacts = []
customers.each do |customer|
  2.times do
    contact = Contact.find_or_create_by!(
      name: "#{nombres_contacto.sample} #{apellidos.sample}",
      customer_id: customer.id
    ) do |c|
      c.email = "#{nombres_contacto.sample.downcase}#{rand(1..999)}@#{customer.name.downcase.gsub(/[^a-z0-9]/, '')}.com"
      c.phone = "3#{rand(0..3)}#{rand(1_000_000..9_999_999)}"
      c.position = cargos.sample
    end
    contacts << contact
  end
end
puts "  Contactos: OK (#{contacts.size})"

# ─── 6. Usuarios propietarios (5) ───

owners = 5.times.map do |i|
  User.find_or_create_by!(email: "ingeniero#{i + 1}@controlmatica.com") do |u|
    u.names = "#{nombres_contacto.sample} #{apellidos.sample}"
    u.password = "Seed2026!"
    u.password_confirmation = "Seed2026!"
    u.rol = rol
  end
end
owners << user
puts "  Propietarios: OK (#{owners.size})"

# ─── 7. Centros de Costo (1000) ───

service_types = %w[SERVICIO VENTA PROYECTO]
execution_states = %w[PENDIENTE EJECUCION FINALIZADO]
invoiced_states = [
  "FACTURADO", "FACTURADO PARCIAL", "LEGALIZADO", "LEGALIZADO PARCIAL",
  "POR FACTURAR", "PENDIENTE DE ORDEN DE COMPRA", "PENDIENTE DE COTIZACION"
]
sales_states = ["SIN COMPRAS", "COMPRANDO", "CERRADO"]

descripciones_prefijo = [
  "Automatización de planta", "Control de procesos", "Instalación eléctrica",
  "Tablero de distribución", "Migración PLC", "Instrumentación industrial",
  "Mantenimiento preventivo", "Cableado estructurado", "Sistema SCADA",
  "Integración de sensores", "Puesta en marcha", "Diseño de tableros",
  "Programación HMI", "Red industrial Ethernet", "Suministro de equipos",
  "Montaje electromecánico", "Calibración de instrumentos", "Consultoría técnica",
  "Ampliación de red eléctrica", "Retrofit de máquinas"
]

descripciones_sufijo = [
  "- Fase 1", "- Fase 2", "- Fase 3", "- Etapa inicial", "- Etapa final",
  "- Planta Norte", "- Planta Sur", "- Sede Principal", "- Zona Industrial",
  "- Línea de Producción", "- Área de Empaque", "- Subestación", "- Cuarto de Control",
  ""
]

puts "\n  Creando 1000 centros de costo..."

# Necesitamos User.current para el callback change_state
User.current = user if User.respond_to?(:current=)

created = 0
errors_count = 0

1000.times do |i|
  customer = customers.sample
  customer_contacts = contacts.select { |c| c.customer_id == customer.id }
  contact = customer_contacts.any? ? customer_contacts.sample : contacts.sample
  owner = owners.sample
  service_type = service_types.sample
  start_date = Date.today - rand(30..730).days
  end_date = start_date + rand(15..180).days

  eng_hours = service_type == "VENTA" ? 0.0 : rand(10..500).to_f
  hours_contractor = service_type == "PROYECTO" ? rand(10..300).to_f : 0.0
  displacement = service_type == "VENTA" ? 0.0 : rand(0..100).to_f
  materials = (service_type == "VENTA" || service_type == "PROYECTO") ? rand(500_000..50_000_000).to_f : 0.0
  viatic = service_type == "VENTA" ? 0.0 : rand(100_000..5_000_000).to_f
  quotation_val = rand(1_000_000..200_000_000).to_f

  begin
    CostCenter.create!(
      customer_id: customer.id,
      contact_id: contact.id,
      user_id: user.id,
      user_owner_id: owner.id,
      service_type: service_type,
      description: "#{descripciones_prefijo.sample} #{descripciones_sufijo.sample} - #{customer.name}",
      start_date: start_date,
      end_date: end_date,
      quotation_number: rand(1..2) == 1 ? "COT-#{rand(1000..9999)}" : "",
      execution_state: "PENDIENTE",
      eng_hours: eng_hours,
      hour_real: 50_000,
      hour_cotizada: 80_000,
      hours_contractor: hours_contractor,
      hours_contractor_real: 45_000,
      hours_contractor_invoices: 70_000,
      displacement_hours: displacement,
      value_displacement_hours: 50_000,
      materials_value: materials,
      viatic_value: viatic,
      quotation_value: quotation_val,
      has_many_quotes: false,
    )
    created += 1
  rescue => e
    errors_count += 1
    puts "    Error ##{i + 1}: #{e.message}" if errors_count <= 5
  end

  print "\r  Progreso: #{created}/1000 (#{errors_count} errores)" if (i + 1) % 50 == 0
end

puts "\n\n  Centros de costo creados: #{created}"
puts "  Errores: #{errors_count}" if errors_count > 0

# ─── 8. Actualizar estados aleatorios (simular actividad) ───

puts "\n  Actualizando estados aleatorios..."

CostCenter.order("RANDOM()").limit(300).update_all(execution_state: "EJECUCION")
CostCenter.order("RANDOM()").limit(200).update_all(execution_state: "FINALIZADO")

CostCenter.where.not(service_type: "SERVICIO").order("RANDOM()").limit(150).update_all(sales_state: "COMPRANDO")
CostCenter.where.not(service_type: "SERVICIO").order("RANDOM()").limit(100).update_all(sales_state: "CERRADO")

CostCenter.order("RANDOM()").limit(200).update_all(invoiced_state: "FACTURADO")
CostCenter.order("RANDOM()").limit(150).update_all(invoiced_state: "POR FACTURAR")
CostCenter.order("RANDOM()").limit(100).update_all(invoiced_state: "LEGALIZADO")

puts "  Estados actualizados: OK"

puts "\n" + "=" * 60
puts "SEED COMPLETADO"
puts "  Clientes:          #{Customer.count}"
puts "  Contactos:         #{Contact.count}"
puts "  Usuarios:          #{User.count}"
puts "  Centros de costo:  #{CostCenter.count}"
puts "=" * 60
