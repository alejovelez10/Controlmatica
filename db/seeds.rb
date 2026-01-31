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
