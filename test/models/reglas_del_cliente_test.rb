require "test_helper"

# Las reglas de gasto del cliente, una por una, tal como quedan configuradas en
# produccion (2026-10-16). Cada prueba arma la regla con los mismos campos de la
# pantalla y comprueba que el sistema la aplica como el cliente la describio.
#
# Los tipos se crean con los nombres reales del catalogo de produccion (con su
# cuenta contable), para que la prueba se lea igual que la pantalla.
class ReglasDelClienteTest < ActiveSupport::TestCase
  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)
    # Las fixtures traen reglas activas; cada prueba ve solo las suyas.
    ExpenseRule.update_all(active: false)

    @casino      = tipo("Casino y restaurante 51956001")
    @alojamiento = tipo("Alojamiento y manutención 51550501")
    @pasajes     = tipo("Pasajes aéreos 51551501")
  end

  def tipo(nombre)
    ReportExpenseOption.create!(name: nombre, category: "Tipo", user_id: @admin.id)
  end

  def regla(excluded_types: [], included_types: [], **attrs)
    as_user(@admin) do
      r = ExpenseRule.new({ active: true, check_duplicates: false, user: @admin }.merge(attrs))
      r.excluded_types = excluded_types
      r.included_types = included_types
      r.save!
      r
    end
  end

  def gasto(tipo, valor, user_invoice: @ingeniero)
    ReportExpense.new(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                      user_invoice: user_invoice, type_identification: tipo, invoice_name: "Proveedor",
                      invoice_date: Date.current, invoice_number: "FE-#{SecureRandom.hex(3)}",
                      identification: "900111222", invoice_value: valor, invoice_tax: 0, invoice_total: valor)
  end

  def revisar(expense)
    ExpenseRuleService.validate(expense).value
  end

  def codigos(lista)
    lista.map { |v| v[:code] }
  end

  # --- 1. Gastos mayores a $300.000 -------------------------------------------
  #
  # «Gastos mayores a 300 mil, excepto alojamiento y manutención y pasajes
  # aéreos, para todos los roles.» Sin «Impedir guardar»: se guardan, pero no
  # se aprueban solos.
  def regla_de_monto
    regla(name: "APROBACION REQUERIDA POR MONTO", applies_to_all_roles: true,
          max_invoice_value: 300_000, mandatory: false,
          excluded_types: [@alojamiento, @pasajes])
  end

  test "regla 1: un gasto de mas de 300 mil se marca, pero no impide guardar" do
    regla_de_monto

    v = revisar(gasto(@casino, 450_000))
    assert_equal [ExpenseRuleService::CODE_VALUE], codigos(v[:violations])
    assert_empty v[:blocking_violations], "Sin «Impedir guardar» el gasto se tiene que poder guardar"
  end

  test "regla 1: 300 mil exactos pasan" do
    regla_de_monto

    assert_empty revisar(gasto(@casino, 300_000))[:violations]
  end

  test "regla 1: alojamiento y manutencion no se revisan, aunque pasen de 300 mil" do
    regla_de_monto

    assert_empty revisar(gasto(@alojamiento, 2_000_000))[:violations]
  end

  test "regla 1: pasajes aereos no se revisan, aunque pasen de 300 mil" do
    regla_de_monto

    assert_empty revisar(gasto(@pasajes, 2_000_000))[:violations]
  end

  test "regla 1: aplica tambien a un rol creado despues" do
    regla_de_monto
    rol_nuevo = Rol.create!(name: "Rol creado despues")
    persona = users(:contador)
    persona.update_columns(rol_id: rol_nuevo.id)

    assert_equal [ExpenseRuleService::CODE_VALUE],
                 codigos(revisar(gasto(@casino, 450_000, user_invoice: persona))[:violations])
  end

  test "regla 1: el gasto de mas de 300 mil se guarda pero no queda aprobado aunque quepa en el presupuesto" do
    regla_de_monto

    g = gasto(@casino, 450_000)
    resultado = ExpenseBudgetService.persist_with_evaluation!(g, actor: @admin)

    assert resultado.ok?, resultado.errors.inspect
    g.reload
    refute g.aceptado?
    refute_equal "aprobado", g.budget_status
  end

  # --- 2. Todo gasto de representacion debe ser aprobado ---------------------
  #
  # El tipo va en «Tipos de gasto no permitidos» y SIN «Impedir guardar»: el
  # gasto se guarda, pero nunca se aprueba solo.
  def regla_de_representacion_aprobada
    regla(name: "APROBAR GASTOS DE REPRESENTACION", applies_to_all_roles: true, mandatory: false,
          included_types: [@representacion = tipo("Gastos de representación 51952001")])
  end

  test "regla 2: un gasto de representacion se guarda y dice que necesita aprobacion" do
    regla_de_representacion_aprobada

    v = revisar(gasto(@representacion, 80_000))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:violations])
    assert_empty v[:blocking_violations], "Sin «Impedir guardar» el gasto se tiene que poder guardar"
    assert_match "necesitan aprobación", v[:violations].first[:message]
    assert_no_match(/No tiene permitido/, v[:violations].first[:message])
  end

  test "regla 2: el gasto de representacion queda sin aprobar aunque sea pequeño y quepa en el presupuesto" do
    regla_de_representacion_aprobada

    g = gasto(@representacion, 20_000)
    resultado = ExpenseBudgetService.persist_with_evaluation!(g, actor: @admin)

    assert resultado.ok?, resultado.errors.inspect
    g.reload
    refute g.aceptado?
    refute_equal "aprobado", g.budget_status
  end

  test "regla 2: los demas tipos no se tocan" do
    regla_de_representacion_aprobada

    assert_empty revisar(gasto(@casino, 80_000))[:violations]
  end

  # --- 3. Representacion solo Administracion, Administrador y Comercial -------
  #
  # «Todos los roles, excepto» esos tres, el tipo en «no permitidos» y CON
  # «Impedir guardar»: a los demas no se les guarda.
  def persona_con_rol(fixture, nombre_rol)
    rol = Rol.find_by(name: nombre_rol) || Rol.create!(name: nombre_rol)
    users(fixture).tap { |u| u.update_columns(rol_id: rol.id) }
  end

  def regla_de_representacion_restringida
    @representacion ||= tipo("Gastos de representación 51952001")
    excluidos = %w[Administracion Administrador Comercial].map { |n| Rol.find_by(name: n) || Rol.create!(name: n) }
    as_user(@admin) do
      r = ExpenseRule.new(name: "CREAR GASTOS DE REPRESENTACION", active: true, check_duplicates: false,
                          user: @admin, applies_to_all_roles: true, mandatory: true)
      r.excluded_rols = excluidos
      r.included_types = [@representacion]
      r.save!
      r
    end
  end

  test "regla 3: un ingeniero no puede guardar un gasto de representacion" do
    regla_de_representacion_restringida
    ingeniero = persona_con_rol(:ingeniero, "Ingeniero")

    v = revisar(gasto(@representacion, 80_000, user_invoice: ingeniero))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:blocking_violations])
    assert_match "No tiene permitido registrar", v[:blocking_violations].first[:message]
  end

  test "regla 3: administracion, administrador y comercial si pueden" do
    regla_de_representacion_restringida

    [[:contador, "Administracion"], [:admin, "Administrador"], [:gerente, "Comercial"]].each do |fixture, rol|
      persona = persona_con_rol(fixture, rol)
      assert_empty revisar(gasto(@representacion, 80_000, user_invoice: persona))[:violations],
                   "#{rol} deberia poder registrar representacion"
    end
  end

  test "regla 3: al ingeniero no le frena los demas tipos" do
    regla_de_representacion_restringida
    ingeniero = persona_con_rol(:ingeniero, "Ingeniero")

    assert_empty revisar(gasto(@casino, 80_000, user_invoice: ingeniero))[:violations]
  end

  test "reglas 2 y 3 juntas: comercial lo guarda sin aprobar; el ingeniero no lo guarda" do
    regla_de_representacion_aprobada
    regla_de_representacion_restringida
    comercial = persona_con_rol(:gerente, "Comercial")
    ingeniero = persona_con_rol(:ingeniero, "Ingeniero")

    del_comercial = gasto(@representacion, 80_000, user_invoice: comercial)
    assert ExpenseBudgetService.persist_with_evaluation!(del_comercial, actor: @admin).ok?
    del_comercial.reload
    refute del_comercial.aceptado?, "Representacion siempre necesita aprobacion (regla 2)"

    del_ingeniero = gasto(@representacion, 80_000, user_invoice: ingeniero)
    refute ExpenseBudgetService.persist_with_evaluation!(del_ingeniero, actor: @admin).ok?
    refute del_ingeniero.persisted?
  end

  # --- 4. Sin licor, excepto en representacion ------------------------------
  #
  # Texto para la IA y «Gastos de representación» en «Tipos a los que no aplica».
  # Lo que encuentra la IA no se puede probar aqui sin la IA de verdad: se
  # prueba lo que hace el servidor con su veredicto, y que el texto le llegue o
  # no segun el tipo.
  TEXTO_LICOR = "Bebidas alcohólicas: licor, cerveza, whisky, vino, ron, vodka, martini, tequila.".freeze

  def regla_sin_licor
    @representacion ||= tipo("Gastos de representación 51952001")
    regla(name: "PALABRAS RESTRINGIDAS", applies_to_all_roles: true, mandatory: true,
          agent_instructions: TEXTO_LICOR, excluded_types: [@representacion])
  end

  def veredicto_con_cerveza(regla)
    { compliant: false, findings: [{ rule_id: regla.id, message: "La factura incluye cerveza" }] }
  end

  test "regla 4: la IA recibe el texto en un gasto de restaurante y no en uno de representacion" do
    r = regla_sin_licor

    a_la_ia = ->(tipo) { ExpenseRuleService.reglas_para_el_agente(ExpenseRule.para_gasto(@ingeniero, tipo.id)) }
    assert_equal [r.id], a_la_ia.call(@casino).map { |x| x[:id] }
    assert_empty a_la_ia.call(@representacion)
  end

  test "regla 4: si la IA encuentra cerveza en un gasto de restaurante, no se guarda" do
    r = regla_sin_licor

    v = ExpenseRuleService.validate(gasto(@casino, 80_000), agent_verdict: veredicto_con_cerveza(r)).value
    assert_equal [ExpenseRuleService::CODE_AGENT], codigos(v[:blocking_violations])
    assert_match "cerveza", v[:blocking_violations].first[:message]
  end

  # --- 5. Combustible solo para cuatro personas ------------------------------
  #
  # «Todos los roles», el tipo en «no permitidos», las cuatro personas en
  # «Personas a las que no aplica» y CON «Impedir guardar».
  def regla_de_combustible(autorizados)
    @combustible ||= tipo("Combustibles 51953501")
    as_user(@admin) do
      r = ExpenseRule.new(name: "Restriccion gastos de Vehiculo", active: true, check_duplicates: false,
                          user: @admin, applies_to_all_roles: true, mandatory: true)
      r.excluded_users = autorizados
      r.included_types = [@combustible]
      r.save!
      r
    end
  end

  test "regla 5: nadie fuera de la lista puede registrar combustible" do
    regla_de_combustible([users(:gerente)])

    v = revisar(gasto(@combustible ||= tipo("Combustibles 51953501"), 120_000))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:blocking_violations])
  end

  test "regla 5: las personas de la lista si pueden, sea cual sea su rol" do
    autorizado = users(:gerente)
    regla_de_combustible([autorizado])

    assert_empty revisar(gasto(@combustible, 120_000, user_invoice: autorizado))[:violations]
  end

  test "regla 5: solo frena combustible, no peajes ni parqueaderos" do
    regla_de_combustible([users(:gerente)])

    assert_empty revisar(gasto(tipo("Peajes 51552501"), 20_000))[:violations]
    assert_empty revisar(gasto(tipo("Parqueaderos 51956501"), 20_000))[:violations]
  end

  test "regla 4: la cerveza en un gasto de representacion no frena" do
    r = regla_sin_licor

    v = ExpenseRuleService.validate(gasto(@representacion, 80_000), agent_verdict: veredicto_con_cerveza(r)).value
    assert_empty v[:violations]
  end
end
