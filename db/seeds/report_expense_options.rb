# ============================================
# Catalogo de tipos de gasto y medios de pago (ReportExpenseOption)
#
# Copia exacta de produccion, con los MISMOS ids. Los ids importan: los gastos
# los referencian por id, y si local y prod no coinciden, un id copiado de prod
# apunta en local a otra cosa (o a otra categoria) sin que nada falle.
#
# OJO con los espacios. Cuatro nombres (ids 3, 4, 5 y 13) traen ESPACIO NO
# SEPARABLE (U+00A0) donde parece haber un espacio normal, y el id 28 TERMINA
# en espacio. Van escritos como \u00A0 y \u0020 a proposito: en un editor son
# invisibles y cualquiera los "arregla" sin darse cuenta. Si se tocan, el
# catalogo local deja de ser el de prod y ReportExpense.import ya no encuentra
# la opcion, porque su LOWER(TRIM(name)) no normaliza el U+00A0.
#
# Se carga desde db/seeds.rb y db/seeds_staging.rb.
# ============================================

REPORT_EXPENSE_OPTIONS = [
  { id: 1, name: "TARJETA DE CREDITO", category: "Medio de pago", user_id: 14,
    created_at: "2021-09-14 04:25:53.191064", updated_at: "2021-09-23 21:08:09.837408" },
  { id: 2, name: "EFECTIVO", category: "Medio de pago", user_id: 14,
    created_at: "2021-09-14 04:26:03.255661", updated_at: "2021-10-04 18:24:25.201847" },
  { id: 3, name: "Taxis y buses\u00A051954501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:13:43.14869", updated_at: "2021-12-31 19:17:36.726473" },
  { id: 4, name: "Casino y restaurante\u00A0 51956001", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:13:53.683075", updated_at: "2021-10-04 18:13:53.683075" },
  { id: 5, name: "Parqueaderos\u00A0 51956501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:14:08.051649", updated_at: "2021-10-04 18:14:08.051649" },
  { id: 6, name: "Peajes 51552501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:14:17.34304", updated_at: "2021-10-04 18:14:17.34304" },
  { id: 7, name: "Combustibles 51953501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:23:49.589214", updated_at: "2021-10-04 18:23:49.589214" },
  { id: 8, name: "Pasajes aéreos 51551501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:23:57.77926", updated_at: "2021-12-31 19:17:57.249503" },
  { id: 9, name: "Alojamiento y manutención  51550501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:24:07.750198", updated_at: "2021-10-04 18:24:07.750198" },
  { id: 10, name: "Dotación  51055101", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:24:15.524329", updated_at: "2021-10-04 18:24:15.524329" },
  { id: 11, name: "Gastos de representación  51952001", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:24:51.150294", updated_at: "2021-10-04 18:24:51.150294" },
  { id: 12, name: "Útiles papelería 51953001", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:25:00.026089", updated_at: "2021-10-04 18:25:00.026089" },
  { id: 13, name: "Elementos de aseo y cafetería\u00A0 51952501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:25:07.282118", updated_at: "2021-10-04 18:25:07.282118" },
  { id: 17, name: "Enseres menores 51959501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:26:05.297955", updated_at: "2021-10-04 18:26:05.297955" },
  { id: 18, name: "Gastos médicos y drogas 51058401", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:26:14.763599", updated_at: "2021-10-04 18:26:14.763599" },
  { id: 20, name: "Otros SEGUROS 513095", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:26:34.940075", updated_at: "2021-10-04 18:26:34.940075" },
  { id: 24, name: "Reparaciones locativas 51501501", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:27:09.092973", updated_at: "2021-10-04 18:27:09.092973" },
  { id: 25, name: "Celular 51353503", category: "Tipo", user_id: 1,
    created_at: "2021-10-04 18:27:21.73726", updated_at: "2021-10-04 18:27:21.73726" },
  { id: 26, name: "CREDITO PROVEEDORES", category: "Medio de pago", user_id: 1,
    created_at: "2021-12-31 19:10:02.522646", updated_at: "2021-12-31 19:10:02.522646" },
  { id: 27, name: "Viáticos de transporte 510521", category: "Tipo", user_id: 1,
    created_at: "2022-08-18 14:36:39.875983", updated_at: "2022-09-27 20:01:52.74435" },
  { id: 28, name: "Gastos deportivos y de recreación - 51056601\u0020", category: "Tipo", user_id: 1,
    created_at: "2023-09-28 13:43:06.801364", updated_at: "2023-09-28 13:43:06.801364" },
  { id: 29, name: "Asesoría Técnica - 51103501", category: "Tipo", user_id: 1,
    created_at: "2024-04-03 15:48:25.523961", updated_at: "2024-04-03 15:48:25.523961" },
].freeze

# Reparto real de produccion (conteos sobre 7.222 gastos). Sirve para que los
# gastos de prueba se parezcan a los de verdad en vez de repartirse parejo:
# en prod dos tipos concentran el 64% y trece juntos no llegan al 4%.
REPORT_EXPENSE_TYPE_WEIGHTS = {
  4 => 2560, 27 => 2020, 3 => 735, 8 => 610, 7 => 599, 9 => 403, 28 => 64,
  6 => 51, 10 => 40, 5 => 27, 25 => 25, 11 => 13, 13 => 11, 20 => 8,
  29 => 6, 17 => 5, 18 => 4, 12 => 3
}.freeze

REPORT_EXPENSE_PAYMENT_WEIGHTS = { 2 => 3547, 1 => 3162, 26 => 505 }.freeze

# Devuelve un id al azar respetando los pesos de arriba.
def pick_weighted(weights)
  total = weights.values.sum
  dado  = rand(total)
  acum  = 0
  weights.each do |id, peso|
    acum += peso
    return id if dado < acum
  end
  weights.keys.last
end

def seed_report_expense_options!
  # upsert_all por id: correr el seed dos veces no duplica (el problema viejo
  # era insert_all a secas, que dejo 4 copias de cada opcion en desarrollo).
  # Los timestamps vienen del catalogo, no de Time.current: asi correr el seed
  # dos veces deja la tabla igual a prod en vez de irla corriendo en cada pasada.
  ReportExpenseOption.upsert_all(REPORT_EXPENSE_OPTIONS.map(&:dup), unique_by: :id)

  # La secuencia queda por encima del id mas alto del catalogo; si no, el
  # primer ReportExpenseOption.create! choca con la clave primaria.
  ReportExpenseOption.connection.execute(
    "SELECT setval('report_expense_options_id_seq', #{REPORT_EXPENSE_OPTIONS.map { |o| o[:id] }.max + 1}, false)"
  )

  # Opciones que no son de prod (catalogos viejos, pruebas sueltas). Solo se
  # borran las que ningun gasto usa; las demas se avisan para revisarlas a mano.
  ajenas = ReportExpenseOption.where.not(id: REPORT_EXPENSE_OPTIONS.map { |o| o[:id] })
  usadas = ReportExpense.where(type_identification_id: ajenas.ids)
                        .or(ReportExpense.where(payment_type_id: ajenas.ids))
                        .pluck(:type_identification_id, :payment_type_id).flatten.compact.uniq
  ajenas.where.not(id: usadas).delete_all
  if usadas.any?
    puts "  ! #{usadas.size} opcion(es) fuera del catalogo de prod siguen en uso: #{usadas.sort.inspect}"
  end

  puts "✓ #{ReportExpenseOption.count} tipos de gasto y medios de pago (catalogo de produccion)"
end
