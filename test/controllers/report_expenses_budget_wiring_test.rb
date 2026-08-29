require "test_helper"

# Cableado de ExpenseBudgetService en ReportExpensesController (tarea 23 del
# paquete 07). Es la prueba de la correccion mas importante de la auditoria.
#
# POR QUE ES UN ARCHIVO APARTE Y NO UN PAR DE CASOS EN EL TEST DEL CONTROLLER:
# lo que se verifica aqui no es el JSON de la respuesta sino un EFECTO EN LA
# BASE sobre gastos que el request ni siquiera menciona. Un `update` que cambia
# de centro tiene que reevaluar el par de ORIGEN, y el unico testigo de eso es
# un tercer gasto que estaba excedido y vuelve a "aprobado". Sin este archivo,
# alguien puede borrar los dos `previous_*` del controller y toda la suite sigue
# verde.
#
# CUPO DE LAS FIXTURES (centro_con_viaticos / ingeniero):
#   partidas activas ..... 500.000 + 200.000 = 700.000
#   gastos preexistentes .. report_expenses(:one) y (:two), 100.000 cada uno
#   Los dos estan en `sin_presupuesto`, que SI consume cupo (§2.6 regla 2).
#   => disponible al empezar cada test: 500.000
class ReportExpensesBudgetWiringTest < ActionDispatch::IntegrationTest
  DISPONIBLE_INICIAL = 500_000

  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @otro = users(:ingeniero_dos)
    @centro = cost_centers(:centro_con_viaticos)
    @centro_ajeno = cost_centers(:centro_ajeno)

    # `create`/`update`/`destroy` de gastos llaman a recalculate_cost_center, que
    # hace update sobre el centro y dispara CostCenter#change_state. Ese callback
    # multiplica hour_cotizada * eng_hours sin guarda de nil y revienta con las
    # fixtures tal cual vienen. Es deuda preexistente del legado (el modelo
    # CostCenter no es de este paquete y las fixtures son del 01): se rellenan
    # los dos campos aqui en vez de tocar archivos ajenos.
    [@centro, @centro_ajeno].each { |c| c.update_columns(hour_cotizada: 0.0, eng_hours: 0.0) }

    sign_in_as @admin
  end

  # Parametros minimos de un gasto valido por la via web.
  def parametros_gasto(**overrides)
    {
      cost_center_id: @centro.id,
      user_invoice_id: @ingeniero.id,
      invoice_name: "Hotel Cableado",
      invoice_date: "2026-06-10",
      description: "Alojamiento",
      invoice_number: "FE-W#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: 100_000,
      invoice_tax: 0,
      invoice_total: 100_000
    }.merge(overrides)
  end

  # Crea el gasto POR LA VIA WEB (no con ReportExpense.create!): el objeto de
  # este archivo es justamente el camino HTTP.
  def crear_por_web(**overrides)
    post report_expenses_path, params: parametros_gasto(**overrides)
    assert_response :success
    ReportExpense.order(:id).last
  end

  # --- Lo que el formulario RECIBE al guardar --------------------------------
  #
  # Aplicar la regla y NO decirlo es, para quien usa la aplicacion, lo mismo que
  # no aplicarla. Hasta hoy el guardado devolvia un "creado con exito" y las
  # violaciones se quedaban en la base: el unico sitio donde se veian era la
  # respuesta de la EXTRACCION, que el camino manual ni siquiera toca.

  test "la respuesta de create trae las reglas incumplidas" do
    regla_default!(max_invoice_value: 50_000)

    post report_expenses_path, params: parametros_gasto(invoice_value: 60_000, invoice_tax: 0,
                                                        invoice_total: 60_000)
    assert_response :success

    cuerpo = JSON.parse(response.body)
    assert_equal "success", cuerpo["type"], "el gasto SE GUARDA: la regla informa, no bloquea"
    assert_equal 1, cuerpo["rule_violations"].size
    assert_includes cuerpo["rule_violations"].first["message"], "supera el tope"
    assert cuerpo["rule_violations"].first["code"].present?
  end

  test "la respuesta de update tambien trae las reglas incumplidas" do
    gasto = crear_por_web_por_total(10_000)
    regla_default!(max_invoice_value: 5_000)

    patch report_expense_path(gasto), params: parametros_gasto(invoice_value: 10_000, invoice_tax: 0,
                                                               invoice_total: 10_000)
    assert_response :success

    assert_equal 1, JSON.parse(response.body)["rule_violations"].size
  end

  test "sin violaciones la respuesta trae la lista vacia y no nil" do
    # El formulario hace `data.rule_violations || []`, pero una lista vacia
    # explicita es lo que distingue "se evaluo y no hubo nada" de "no se evaluo".
    post report_expenses_path, params: parametros_gasto
    assert_response :success

    assert_equal [], JSON.parse(response.body)["rule_violations"]
  end

  # --- Reglas de gasto por la via manual -------------------------------------
  #
  # LAS REGLAS SE PROBABAN EN TRES SITIOS Y EN NINGUNO ERA EL FORMULARIO: el
  # servicio (expense_rule_service_test), la tool de WhatsApp
  # (report_expenses_create_tool_test) y el endpoint de extraccion
  # (report_expenses_extract_receipt_test). El canal por el que entra la inmensa
  # mayoria de los gastos —una persona llenando el formulario— no tenia ni una
  # asercion, y es justo donde `apply_expense_rules` puede dejar de correr sin
  # que nada avise: vive en un `before_save` del modelo, asi que basta con que
  # alguien mueva el guardado a un `update_columns` o a un `insert_all` para que
  # se lo salte en silencio.

  # La regla de VALOR compara contra `invoice_total` (CON IVA), no contra
  # `invoice_value`. Este helper mueve los tres campos a la vez para que un test
  # que dice "un gasto de $50.000" signifique eso y no un gasto cuyo total sigue
  # siendo el del helper base.
  def crear_por_web_por_total(total, **overrides)
    crear_por_web(invoice_value: total, invoice_tax: 0, invoice_total: total, **overrides)
  end

  def regla_default!(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Regla de prueba", active: true, is_default: true,
                            check_duplicates: false }.merge(attrs))
    end
  end

  test "create por la via web aplica las reglas y guarda la violacion" do
    regla_default!(max_invoice_value: 50_000)

    gasto = crear_por_web_por_total(60_000)

    refute_empty gasto.rule_violations,
                 "el formulario tiene que evaluar las reglas igual que WhatsApp"
    assert_equal 1, gasto.rule_violations.size
  end

  test "una violacion no impide guardar por la via web" do
    regla_default!(max_invoice_value: 50_000)

    assert_difference "ReportExpense.count", 1 do
      post report_expenses_path, params: parametros_gasto(invoice_value: 60_000)
    end
    assert_equal "success", JSON.parse(response.body)["type"]
  end

  # LA CONSECUENCIA QUE DE VERDAD IMPORTA: el gasto CABIA en el cupo —sin la
  # regla quedaria "aprobado"— y la violacion lo baja a `sin_presupuesto` con su
  # motivo. Si `apply_expense_rules` dejara de correr por la via web, este es el
  # unico test que lo notaria.
  test "una violacion impide que el gasto quede aprobado por la via web" do
    regla_default!(max_invoice_value: 50_000)

    gasto = crear_por_web(invoice_value: 60_000)

    assert_equal "sin_presupuesto", gasto.budget_status
    assert_includes gasto.budget_reason, "No se aprueba por incumplir las reglas de gasto"
  end

  # Y su corolario, ahora que el gasto se acepta solo: un gasto que rompe una
  # regla NO nace aceptado, aunque le sobre cupo. Sin esta asercion, aflojar el
  # orden de los callbacks mandaria a contabilidad gastos que rompen reglas.
  test "un gasto que rompe una regla no nace aceptado" do
    regla_default!(max_invoice_value: 50_000)

    gasto = crear_por_web(invoice_value: 60_000)

    refute gasto.is_acepted
  end

  test "sin reglas activas el gasto que cabe nace aprobado y aceptado" do
    # Control negativo: sin este, los cuatro tests de arriba pasarian igual si
    # `crear_por_web` estuviera roto y devolviera siempre lo mismo.
    gasto = crear_por_web(invoice_value: 60_000)

    assert_empty gasto.rule_violations
    assert_equal "aprobado", gasto.budget_status
    assert gasto.is_acepted
  end

  # HUECO CONOCIDO, fijado aqui para que no se pierda.
  #
  # `apply_expense_rules` escribe el motivo legible SOLO si el gasto venia en
  # `aprobado` (es un `return unless`). Un gasto que ademas no tiene partida ya
  # entra como `sin_presupuesto`, asi que la violacion se guarda en
  # `rule_violations` —que NO esta en ReportExpenseSerializer::attributes— y
  # `budget_reason` se queda en nil. Resultado: la regla se aplico, el gasto no
  # quedo aprobado, y NO HAY NINGUNA PANTALLA donde se pueda leer por que.
  #
  # No se arregla aqui: cambiarlo es decidir que texto gana cuando el gasto
  # incumple una regla Y no tiene presupuesto, y eso es decision de producto.
  test "sin partida, la violacion de regla se guarda pero no deja motivo legible" do
    regla_default!(max_invoice_value: 5_000)

    # ingeniero_dos no tiene partida en este centro.
    gasto = crear_por_web(user_invoice_id: @otro.id, invoice_value: 10_000)

    refute_empty gasto.rule_violations, "la regla SI se evaluo y se guardo"
    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.budget_reason,
               "documenta el hueco: no hay texto que mostrarle al usuario"
  end

  # LAS TRES REGLAS DETERMINISTAS DE LA TABLA "Reglas de gastos", una por una y
  # por el formulario. Arriba solo se probaba `max_invoice_value`: que una
  # funcione no prueba que funcionen las otras dos, porque cada una es un
  # `check_*` distinto dentro de `ExpenseRuleService.validate` y cualquiera puede
  # quedar fuera de la suma de violaciones sin que las demas se enteren.

  test "regla de TIEMPO: una factura mas vieja que el maximo viola por la via web" do
    regla_default!(max_invoice_age_days: 30)

    gasto = crear_por_web(invoice_date: (Date.current - 45).to_s)

    assert_equal 1, gasto.rule_violations.size
    assert_includes gasto.rule_violations.first["message"], "45 días"
    assert_includes gasto.rule_violations.first["message"], "máximo son 30"
  end

  test "regla de TIEMPO: dentro del plazo no viola" do
    regla_default!(max_invoice_age_days: 30)

    gasto = crear_por_web(invoice_date: (Date.current - 10).to_s)

    assert_empty gasto.rule_violations
  end

  # El tope es INCLUSIVO: un gasto exactamente igual al tope NO viola. Se prueba
  # porque es la clase de limite que se implementa con `<` en vez de `<=` y nadie
  # lo nota hasta que un usuario reclama por un gasto de exactamente $50.000.
  test "regla de VALOR: un gasto igual al tope no viola por la via web" do
    regla_default!(max_invoice_value: 50_000)

    gasto = crear_por_web_por_total(50_000)

    assert_empty gasto.rule_violations
  end

  test "regla de VALOR: un peso por encima del tope si viola" do
    regla_default!(max_invoice_value: 50_000)

    gasto = crear_por_web_por_total(50_001)

    assert_equal 1, gasto.rule_violations.size
  end

  # EL TOPE SE MIDE CONTRA EL TOTAL, CON IVA. No es lo mismo que usa el
  # presupuesto, que consume `invoice_value` SIN IVA (regla 1 de
  # ExpenseBudgetService). Dos controles sobre la misma factura y dos bases
  # distintas: quien pone un tope de $50.000 esta topando lo que se paga, no la
  # base gravable. Se fija aqui porque no esta escrito en ninguna pantalla.
  test "regla de VALOR: el tope mira el total con IVA, no la base" do
    regla_default!(max_invoice_value: 50_000)

    # Base por debajo del tope, total por encima: viola igual.
    gasto = crear_por_web(invoice_value: 45_000, invoice_tax: 10_000, invoice_total: 55_000)

    assert_equal 1, gasto.rule_violations.size
    assert_includes gasto.rule_violations.first["message"], "supera el tope"
  end

  test "regla de DUPLICADOS: misma factura y mismo NIT viola por la via web" do
    regla_default!(check_duplicates: true)

    primero = crear_por_web(invoice_number: "FE-DUP-001", identification: "900123456")
    assert_empty primero.rule_violations

    segundo = crear_por_web(invoice_number: "FE-DUP-001", identification: "900123456")

    assert_equal 1, segundo.rule_violations.size
    assert_includes segundo.rule_violations.first["message"], "Ya existe el gasto ##{primero.id}"
  end

  test "regla de DUPLICADOS apagada: la misma factura no viola" do
    regla_default!(check_duplicates: false)

    crear_por_web(invoice_number: "FE-DUP-002", identification: "900123456")
    segundo = crear_por_web(invoice_number: "FE-DUP-002", identification: "900123456")

    assert_empty segundo.rule_violations
  end

  # Las tres a la vez: `effective_limits` combina reglas y la suma de violaciones
  # tiene que traerlas todas, no quedarse en la primera.
  test "las tres reglas se acumulan en el mismo gasto" do
    regla_default!(max_invoice_value: 50_000, max_invoice_age_days: 30, check_duplicates: true)

    crear_por_web(invoice_number: "FE-TRES-001", identification: "900123456", invoice_value: 10_000,
                  invoice_date: (Date.current - 5).to_s)
    gasto = crear_por_web(invoice_number: "FE-TRES-001", identification: "900123456",
                          invoice_value: 60_000, invoice_date: (Date.current - 45).to_s)

    codigos = gasto.rule_violations.map { |v| v["code"] }.sort
    assert_equal 3, codigos.size, "faltan violaciones: #{gasto.rule_violations.inspect}"
  end

  # UNA REGLA ASIGNADA A UNA PERSONA, que es el otro modo de la tabla ademas de
  # la default. `ExpenseRule.aplicables_a` da prioridad a las asignadas: si el
  # responsable tiene alguna, la default NO se aplica. Se prueba por el
  # formulario porque el responsable del gasto lo elige el formulario, y es facil
  # que el codigo evalue las reglas del usuario EQUIVOCADO (el que guarda en vez
  # del responsable).
  test "regla asignada al responsable se aplica y desplaza a la default" do
    as_user(@admin) do
      ExpenseRule.create!(name: "Default floja", active: true, is_default: true,
                          check_duplicates: false, max_invoice_value: 900_000)
      regla = ExpenseRule.create!(name: "Regla de Ingeniero", active: true, is_default: false,
                                  check_duplicates: false, max_invoice_value: 20_000)
      regla.users << @ingeniero
    end

    # El responsable es @ingeniero, que tiene regla propia de 20.000.
    gasto = crear_por_web(user_invoice_id: @ingeniero.id, invoice_value: 30_000)
    refute_empty gasto.rule_violations, "tenia que aplicarse la regla del responsable"

    # @otro no tiene regla propia: le toca la default floja de 900.000.
    otro = crear_por_web(user_invoice_id: @otro.id, invoice_value: 30_000)
    assert_empty otro.rule_violations, "a quien no tiene regla propia le aplica la default"
  end

  # `agent_instructions` NO lo evalua el servidor: es texto para el agente de
  # Taimes. Se fija aqui porque desde la tabla de reglas se ve como un campo mas,
  # y quien configure solo ese campo creera que puso un control que no existe.
  test "agent_instructions no produce violaciones por la via web" do
    regla_default!(agent_instructions: "No aprobar gastos de licor bajo ninguna circunstancia")

    gasto = crear_por_web(invoice_name: "Licor para el equipo", invoice_value: 300_000)

    assert_empty gasto.rule_violations
    assert_equal "aprobado", gasto.budget_status
  end

  test "update por la via web reevalua las reglas" do
    gasto = crear_por_web(invoice_value: 10_000)
    assert_empty gasto.rule_violations

    regla_default!(max_invoice_value: 5_000)
    patch report_expense_path(gasto), params: parametros_gasto(invoice_value: 10_000)
    assert_response :success

    refute_empty gasto.reload.rule_violations,
                 "editar un gasto tiene que volver a pasarlo por las reglas vigentes"
  end

  # --- create ---------------------------------------------------------------

  test "create en centro con partida y cupo deja budget_status aprobado" do
    gasto = crear_por_web(invoice_value: DISPONIBLE_INICIAL - 1)

    assert_equal "aprobado", gasto.budget_status,
                 "El gasto cabe en el cupo: sin el cableado queda en sin_presupuesto"
    assert_nil gasto.budget_reason
    assert_equal expense_budgets(:activa_ingeniero).id, gasto.expense_budget_id,
                 "Se imputa a la partida MAS ANTIGUA del par (FIFO)"
  end

  test "create con cupo insuficiente deja excedido con budget_reason" do
    gasto = crear_por_web(invoice_value: DISPONIBLE_INICIAL + 250_000)

    assert_equal "excedido", gasto.budget_status
    refute_nil gasto.budget_reason
    refute_empty gasto.budget_reason
    assert_includes gasto.budget_reason, "Excede el presupuesto disponible"
    # El expense_budget_id se llena TAMBIEN en excedido: es informativo y da
    # trazabilidad de contra que partida no alcanzo.
    assert_equal expense_budgets(:activa_ingeniero).id, gasto.expense_budget_id
  end

  test "create sin partida deja sin_presupuesto" do
    # ingeniero_dos no tiene ninguna partida en este centro.
    gasto = crear_por_web(user_invoice_id: @otro.id, invoice_value: 10_000)

    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.budget_reason
    assert_nil gasto.expense_budget_id
  end

  test "el JSON de create devuelve el estado presupuestal ya calculado" do
    # Sin esto la pantalla tiene que recargar la tabla para enterarse de que el
    # gasto que acaba de crear esta excedido.
    crear_por_web(invoice_value: DISPONIBLE_INICIAL + 100_000)

    registro = assert_json_success
    assert_equal "excedido", registro["budget_status"]
    refute_nil registro["budget_reason"]
  end

  # --- update ---------------------------------------------------------------

  # Deja el par (centro_con_viaticos, ingeniero) exprimido: `grande` se come todo
  # el cupo y `chico` queda excedido detras de el.
  def montar_par_saturado
    grande = crear_por_web(invoice_value: DISPONIBLE_INICIAL)
    chico  = crear_por_web(invoice_value: 50_000)

    assert_equal "aprobado", grande.reload.budget_status
    assert_equal "excedido", chico.reload.budget_status, "montaje: el segundo gasto debe quedar excedido"
    [grande, chico]
  end

  test "update que cambia de centro reevalua el centro anterior" do
    grande, chico = montar_par_saturado

    patch report_expense_path(grande), params: { cost_center_id: @centro_ajeno.id }
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "Al sacar el gasto grande del centro se libera cupo: si `previous_cost_center_id` " \
                 "se leyera DESPUES del assign_attributes, el par de origen no se reevaluaria"
    # Y el gasto movido queda sin partida en el centro nuevo.
    assert_equal @centro_ajeno.id, grande.reload.cost_center_id
    assert_equal "sin_presupuesto", grande.budget_status
  end

  test "update que cambia de responsable reevalua al responsable anterior" do
    grande, chico = montar_par_saturado

    patch report_expense_path(grande), params: { user_invoice_id: @otro.id }
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "Al cambiar de responsable se libera el cupo del responsable anterior"
    assert_equal @otro.id, grande.reload.user_invoice_id
    assert_equal "sin_presupuesto", grande.budget_status,
                 "ingeniero_dos no tiene partida en este centro"
  end

  test "update que sube el valor por encima del cupo deja el gasto excedido" do
    gasto = crear_por_web(invoice_value: 10_000)
    assert_equal "aprobado", gasto.budget_status

    patch report_expense_path(gasto), params: { invoice_value: DISPONIBLE_INICIAL + 200_000 }
    assert_response :success

    assert_equal "excedido", gasto.reload.budget_status
    refute_empty gasto.budget_reason.to_s
  end

  # --- destroy --------------------------------------------------------------

  test "destroy libera el cupo del par centro-usuario" do
    grande, chico = montar_par_saturado

    delete report_expense_path(grande)
    assert_response :success

    assert_equal "aprobado", chico.reload.budget_status,
                 "on_expense_destroyed! no se llamo: un gasto excedido se queda marcado para siempre"
  end

  test "destroy recalcula el centro de costos" do
    gasto = crear_por_web(invoice_value: 123_000)
    antes = @centro.reload.viat_costo_real.to_f

    delete report_expense_path(gasto)
    assert_response :success

    assert_in_delta antes - 123_000, @centro.reload.viat_costo_real.to_f, 0.01,
                    "El destroy no llamo a recalculate_cost_center: viat_costo_real queda inflado"
  end
end
