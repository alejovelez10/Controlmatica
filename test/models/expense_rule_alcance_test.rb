require "test_helper"

# A QUIEN Y A QUE TIPO DE GASTO APLICA UNA REGLA, Y LAS PROHIBICIONES (2026-10-14).
#
# Las tres reglas reales que motivaron esto, escritas antes como texto para el
# agente, que solo ve el comprobante y por eso adivinaba:
#
#   * "Representacion solo para administrador, comercial y administracion"
#       -> Todos los roles excepto esos tres + Solo: Representacion + Prohibir
#   * "Combustible, parqueaderos y peajes solo para cuatro personas"
#       -> Todos los roles + personas excluidas + Solo: esos tipos + Prohibir
#   * "Sin licor, salvo en representacion"
#       -> Todos los roles + Excepto: Representacion + texto para el agente
#
# Cada bloque de abajo prueba una pieza de esas tres.
class ExpenseRuleAlcanceTest < ActiveSupport::TestCase
  setup do
    @admin     = users(:admin)
    @gerente   = users(:gerente)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)
    @alimentacion = report_expense_options(:opcion_tipo)
    @representacion = ReportExpenseOption.create!(name: "Representación", category: "Tipo",
                                                  user_id: @admin.id)
    # Las fixtures traen reglas activas asignadas al rol gerente; se apagan para
    # que cada prueba vea solo las suyas.
    ExpenseRule.update_all(active: false)
  end

  def regla(rols: [], excluded_rols: [], excluded_users: [], included_types: [], excluded_types: [],
            **attrs)
    as_user(@admin) do
      r = ExpenseRule.new({ name: "Regla #{SecureRandom.hex(3)}", active: true,
                            check_duplicates: false, user: @admin }.merge(attrs))
      r.rols = rols
      r.excluded_rols = excluded_rols
      r.excluded_users = excluded_users
      r.included_types = included_types
      r.excluded_types = excluded_types
      r.save!
      r
    end
  end

  def gasto_nuevo(**attrs)
    ReportExpense.new({ omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                        user_invoice: @ingeniero, invoice_name: "Restaurante", invoice_date: Date.current,
                        invoice_number: "FE-#{SecureRandom.hex(3)}", identification: "900111222",
                        invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000,
                        type_identification: @alimentacion }.merge(attrs))
  end

  def resultado(expense, **kwargs)
    ExpenseRuleService.validate(expense, **kwargs).value
  end

  def codigos(lista)
    lista.map { |v| v[:code] }
  end

  # --- Resolucion por rol y por persona --------------------------------------

  test "una regla de todos los roles aplica a cualquier rol" do
    general = regla(applies_to_all_roles: true)

    assert_includes ExpenseRule.aplicables_a(@ingeniero), general
    assert_includes ExpenseRule.aplicables_a(@gerente), general
  end

  test "todos los roles excepto uno no le aplica a ese rol" do
    general = regla(applies_to_all_roles: true, excluded_rols: [@gerente.rol])

    assert_includes ExpenseRule.aplicables_a(@ingeniero), general
    assert_not_includes ExpenseRule.aplicables_a(@gerente), general
  end

  # LA DECISION CON MAS CONSECUENCIAS: si una regla general contara como "regla
  # asignada", crear "sin licor para todos" le quitaria la regla por defecto a
  # toda la empresa sin que nadie lo note.
  test "una regla de todos los roles no le quita la regla por defecto a nadie" do
    por_defecto = regla(is_default: true, max_invoice_value: 50_000)
    general = regla(applies_to_all_roles: true)

    aplicables = ExpenseRule.aplicables_a(@ingeniero).to_a
    assert_includes aplicables, por_defecto
    assert_includes aplicables, general
  end

  test "una regla de solo estos roles sigue desplazando a la por defecto" do
    por_defecto = regla(is_default: true)
    propia = regla(rols: [@ingeniero.rol])

    aplicables = ExpenseRule.aplicables_a(@ingeniero).to_a
    assert_equal [propia], aplicables
    assert_not_includes aplicables, por_defecto
  end

  test "una persona excluida queda fuera de la regla y los demas de su rol no" do
    general = regla(applies_to_all_roles: true, excluded_users: [@ingeniero])

    assert_not_includes ExpenseRule.aplicables_a(@ingeniero), general
    assert_includes ExpenseRule.aplicables_a(users(:ingeniero_dos)), general
  end

  test "excluida de su unica regla especifica, la persona cae a la por defecto" do
    por_defecto = regla(is_default: true)
    regla(rols: [@ingeniero.rol], excluded_users: [@ingeniero])

    assert_equal [por_defecto], ExpenseRule.aplicables_a(@ingeniero).to_a
  end

  test "una regla general inactiva no aplica" do
    general = regla(applies_to_all_roles: true, active: false)

    assert_not_includes ExpenseRule.aplicables_a(@ingeniero), general
  end

  # --- Filtro por tipo -------------------------------------------------------
  #
  # Desde el 2026-10-16 los tipos de la regla son los PROHIBIDOS y no acotan
  # sus limites: la regla aplica a todos los gastos de la persona, salvo los
  # tipos de «excepto».

  test "una regla con tipos prohibidos aplica tambien a los gastos de otros tipos" do
    prohibe_representacion = regla(applies_to_all_roles: true, included_types: [@representacion])

    assert_includes ExpenseRule.para_gasto(@ingeniero, @representacion.id), prohibe_representacion
    assert_includes ExpenseRule.para_gasto(@ingeniero, @alimentacion.id), prohibe_representacion
  end

  test "sin tipo elegido la regla aplica, pero no prohibe nada" do
    prohibe_representacion = regla(applies_to_all_roles: true, included_types: [@representacion])

    assert_includes ExpenseRule.para_gasto(@ingeniero, nil), prohibe_representacion
    assert_empty resultado(gasto_nuevo(type_identification: nil))[:violations]
  end

  test "excepto estos tipos aplica a todos los demas, tambien sin tipo elegido" do
    sin_licor = regla(applies_to_all_roles: true, excluded_types: [@representacion])

    assert_not_includes ExpenseRule.para_gasto(@ingeniero, @representacion.id), sin_licor
    assert_includes ExpenseRule.para_gasto(@ingeniero, @alimentacion.id), sin_licor
    assert_includes ExpenseRule.para_gasto(@ingeniero, nil), sin_licor
  end

  test "el tope de una regla que prohibe otro tipo si frena los demas gastos" do
    # Los limites y los tipos son cosas distintas: prohibir Representacion no
    # hace que el tope deje de revisarse en Alimentacion.
    regla(applies_to_all_roles: true, included_types: [@representacion], max_invoice_value: 1_000)

    v = resultado(gasto_nuevo(invoice_value: 50_000, invoice_total: 50_000))
    assert_equal [ExpenseRuleService::CODE_VALUE], codigos(v[:violations])
  end

  # --- Validaciones de la regla ------------------------------------------------

  test "prohibits_expense se deriva de los tipos: sin tipos no prohibe" do
    # Sin tipos, prohibir seria prohibirlo todo. La marca ya no se elige: la
    # deciden los tipos.
    r = regla(applies_to_all_roles: true, prohibits_expense: true)

    refute r.prohibits_expense
    refute r.prohibe?
  end

  test "un tipo no puede estar incluido y excluido a la vez" do
    r = ExpenseRule.new(name: "Cruzada", applies_to_all_roles: true)
    r.included_types = [@representacion]
    r.excluded_types = [@representacion]

    assert_not r.valid?
    assert_match "Representación", r.errors[:excluded_types].first
  end

  test "la regla por defecto no puede ser ademas de todos los roles" do
    r = ExpenseRule.new(name: "Doble", is_default: true, applies_to_all_roles: true)

    assert_not r.valid?
    assert r.errors[:is_default].any?
  end

  # --- Prohibiciones -----------------------------------------------------------

  test "un tipo prohibido frena el gasto y dice la regla" do
    regla(name: "Representación solo directivos", applies_to_all_roles: true,
          excluded_rols: [@gerente.rol], included_types: [@representacion], prohibits_expense: true)

    v = resultado(gasto_nuevo(type_identification: @representacion))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:blocking_violations])
    mensaje = v[:blocking_violations].first[:message]
    assert_match "Representación", mensaje
    assert_match "Representación solo directivos", mensaje
  end

  test "el rol excluido si puede registrar el tipo prohibido" do
    regla(applies_to_all_roles: true, excluded_rols: [@gerente.rol],
          included_types: [@representacion], prohibits_expense: true)

    v = resultado(gasto_nuevo(type_identification: @representacion, user_invoice: @gerente))
    assert_empty v[:violations]
  end

  test "la persona excluida si puede registrar el tipo prohibido" do
    regla(applies_to_all_roles: true, excluded_users: [@ingeniero],
          included_types: [@representacion], prohibits_expense: true)

    assert_empty resultado(gasto_nuevo(type_identification: @representacion))[:violations]
  end

  test "la prohibicion no toca los demas tipos" do
    regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true)

    assert_empty resultado(gasto_nuevo(type_identification: @alimentacion))[:violations]
  end

  test "una prohibicion no obligatoria avisa pero no frena" do
    regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true,
          mandatory: false)

    v = resultado(gasto_nuevo(type_identification: @representacion))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:violations])
    assert_empty v[:blocking_violations]
  end

  # Borrar el tipo desde Parametrizaciones lo saca de la regla en cascada. Una
  # prohibicion sin tipos NO puede pasar a prohibirlo todo.
  test "una prohibicion que se quedo sin tipos deja de prohibir" do
    r = regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true)
    ExpenseRule.connection.execute("DELETE FROM expense_rules_included_types WHERE expense_rule_id = #{r.id}")

    assert_empty resultado(gasto_nuevo(type_identification: @alimentacion))[:violations]
  end

  # --- El caso del licor -------------------------------------------------------
  #
  # En la web el agente juzga al extraer, antes de que se elija el tipo, contra
  # las instrucciones de todas las reglas de la persona. Si al guardar el tipo
  # deja fuera a la unica regla con texto, ese "no cumple" no puede frenar.

  test "el licor frena un gasto comun" do
    regla(applies_to_all_roles: true, excluded_types: [@representacion],
          agent_instructions: "No se aceptan bebidas alcohólicas.")
    veredicto = { compliant: false, findings: ["El comprobante incluye cerveza"] }

    v = resultado(gasto_nuevo(type_identification: @alimentacion), agent_verdict: veredicto)
    assert_equal [ExpenseRuleService::CODE_AGENT], codigos(v[:blocking_violations])
  end

  test "el licor no frena un gasto de representacion" do
    regla(applies_to_all_roles: true, excluded_types: [@representacion],
          agent_instructions: "No se aceptan bebidas alcohólicas.")
    veredicto = { compliant: false, findings: ["El comprobante incluye cerveza"] }

    v = resultado(gasto_nuevo(type_identification: @representacion), agent_verdict: veredicto)
    assert_empty v[:violations]
  end

  # --- Al guardar el gasto ---------------------------------------------------------

  test "no se puede crear un gasto de un tipo prohibido" do
    regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true)

    gasto = gasto_nuevo(type_identification: @representacion)
    as_user(@admin) { assert_not gasto.save }
    assert_match "Representación", gasto.errors[:base].join
  end

  # Si no, la prohibicion se saltaria creando el gasto con otro tipo y
  # cambiandoselo despues.
  test "cambiarle el tipo a uno prohibido al editar frena" do
    gasto = as_user(@admin) { gasto_nuevo.tap(&:save!) }
    regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true)

    as_user(@admin) { assert_not gasto.update(type_identification: @representacion) }
    assert_match "Representación", gasto.errors[:base].join
  end

  # Un gasto que ya era de ese tipo antes de la regla tiene que poder seguir
  # editandose: aceptarlo, corregirle el nombre, contabilizarlo.
  test "editar otro campo de un gasto que ya era del tipo prohibido no frena" do
    gasto = as_user(@admin) { gasto_nuevo(type_identification: @representacion).tap(&:save!) }
    regla(applies_to_all_roles: true, included_types: [@representacion], prohibits_expense: true)

    as_user(@admin) { assert gasto.update(description: "Cena con cliente"), gasto.errors.full_messages.join }
  end

  # --- Los tipos de la regla son los prohibidos (2026-10-16) -------------------
  #
  # La regla 67 de produccion («CREAR GASTOS DE REPRESENTACION») tenia el tipo
  # elegido y la casilla «Prohibir el gasto» sin marcar, y dejaba crear los
  # gastos que el cliente queria frenar. Ahora el tipo elegido ES la
  # prohibicion.

  test "una regla con tipos prohibe aunque no se haya marcado prohibir" do
    r = regla(applies_to_all_roles: true, excluded_rols: [@gerente.rol], included_types: [@representacion],
              prohibits_expense: false, mandatory: true)

    assert r.prohibits_expense
    v = resultado(gasto_nuevo(type_identification: @representacion))
    assert_equal [ExpenseRuleService::CODE_PROHIBITED], codigos(v[:blocking_violations])
  end

  test "el rol excluido de esa regla si puede registrar el tipo" do
    regla(applies_to_all_roles: true, excluded_rols: [@gerente.rol], included_types: [@representacion])

    assert_empty resultado(gasto_nuevo(type_identification: @representacion, user_invoice: @gerente))[:violations]
  end

  test "una regla puede prohibir un tipo y ademas pasarle su texto a la IA" do
    r = regla(applies_to_all_roles: true, included_types: [@representacion], agent_instructions: "Bebidas alcoholicas")

    assert_equal "Bebidas alcoholicas", ExpenseRuleService.effective_limits([r])[:agent_instructions]
    assert_equal [r.id], ExpenseRuleService.reglas_para_el_agente([r]).map { |x| x[:id] }
  end

  test "los limites no se revisan en los tipos de excepto" do
    regla(applies_to_all_roles: true, excluded_types: [@representacion], max_invoice_value: 1_000)

    gasto = gasto_nuevo(type_identification: @representacion, invoice_value: 50_000, invoice_total: 50_000)
    assert_empty resultado(gasto)[:violations]
  end
end
