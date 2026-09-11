require "test_helper"

# API de partidas presupuestales (paquete 07, contratos A.1 a A.7).
#
# LAS TRES FIGURAS DE AUTORIZACION que este archivo distingue —y que ninguna
# prueba anterior distinguia— son:
#
#   pleno    : tiene el modulo Presupuesto CON "Ver todos". Administra cualquier
#              centro.
#   limitado : tiene el modulo SIN "Ver todos" y no es dueno de ningun centro.
#              Solo ve y administra lo suyo.
#   dueno    : igual que `limitado`, pero es el `user_owner` de un centro. Puede
#              administrar TODAS las partidas de ESE centro y ninguna del ajeno.
#
# Con un solo usuario que lo tenga todo, el filtro por `user_id` y el gate por
# propiedad pasarian las pruebas aunque no existieran. Por eso `presupuesto_pleno`
# y `presupuesto_limitado` son dos roles distintos que se diferencian en UNA
# accion.
class ExpenseBudgetsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    # `gerente` trae presupuesto_ingreso/crear/editar/eliminar Y ver_todos sin
    # ser Administrador: es el "pleno" del contrato sin inventar una etiqueta
    # nueva en users.yml (que es del paquete 01).
    @pleno = users(:gerente)
    @dueno = users(:dueno_centro)        # rol presupuesto_limitado + user_owner de centro_con_viaticos
    @sin_permisos = users(:sin_permisos)

    # `limitado`: mismas acciones que el dueno pero SIN ser dueno de ningun
    # centro. Se arma reasignando el rol de una fixture existente en vez de
    # agregar un usuario a users.yml, que tiene dueno unico (paquete 01, §7.2).
    @limitado = users(:ingeniero_dos)
    @limitado.update_columns(rol_id: rols(:presupuesto_limitado).id)

    @centro = cost_centers(:centro_con_viaticos)   # viatic_value 5.000.000, dueno: dueno_centro
    @centro_sin_viaticos = cost_centers(:centro_sin_viaticos)
    @centro_ajeno = cost_centers(:centro_ajeno)    # dueno: contador

    @partida = expense_budgets(:activa_ingeniero)          # 500.000, ingeniero
    @partida_segunda = expense_budgets(:activa_ingeniero_segunda)  # 200.000, ingeniero
    @partida_inactiva = expense_budgets(:inactiva_ingeniero)       # 900.000, anulada
    @partida_contador = expense_budgets(:activa_otro_usuario)      # 300.000, contador

    # Quinta partida del centro, del usuario `limitado`. Sirve para dos cosas: el
    # test de "solo veo las mias" necesita que el limitado tenga alguna, y el de
    # conteo de queries necesita 5 filas en una sola pagina.
    @partida_limitado = as_user(@admin) do
      ExpenseBudget.create!(cost_center: @centro, user: @limitado, amount: 150_000,
                            notes: "Partida del limitado", created_by: @admin)
    end

    # Los gastos preexistentes de las fixtures representan cupo YA EJECUTADO.
    # Desde 2026-09-10 solo lo ACEPTADO consume (ExpenseBudgetService.consumidores)
    # y las fixtures del paquete 01 nacen sin aceptar: sin esto el disponible de
    # partida sube y toda la aritmetica de este archivo se corre. Se marca aqui y
    # no en el YAML para no cambiarle el escenario al resto del repo.
    ReportExpense.update_all(is_acepted: true)
  end

  def listado_path(centro = @centro)
    "/get_expense_budgets/#{centro.id}"
  end

  def resumen_path(centro = @centro)
    "/get_expense_budget_summary/#{centro.id}"
  end

  # Cuenta las consultas SQL reales, ignorando esquema y transacciones.
  def contar_queries
    consultas = []
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |_n, _s, _f, _i, payload|
      consultas << payload[:sql] unless %w[SCHEMA TRANSACTION].include?(payload[:name])
    end
    yield
    consultas
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber)
  end

  # =========================================================================
  # A.1 — get_expense_budgets
  # =========================================================================

  test "get_expense_budgets devuelve data y total con la forma del contrato" do
    sign_in_as @admin

    get listado_path

    assert_equal %w[data total].sort, json_body.keys.sort
    data = assert_json_list
    esperadas = %w[id cost_center_id user_id user amount notes active spent available
                   created_by last_user_edited created_at updated_at]
    assert_equal [], esperadas - data.first.keys,
                 "Faltan claves del contrato A.2: #{(esperadas - data.first.keys).inspect}"
    # UserSerializer expone id, names y phone (phone lo agrego el trabajo de
    # WhatsApp que ya estaba en la rama).
    assert_equal %w[id names phone].sort, data.first["user"].keys.sort
  end

  test "get_expense_budgets sin permiso del modulo responde 403" do
    sign_in_as @sin_permisos

    get listado_path

    mensajes = assert_json_forbidden
    assert_kind_of Array, mensajes
    assert_equal 1, mensajes.size
    assert_kind_of String, mensajes.first
  end

  test "get_expense_budgets sin Ver todos y sin ser dueno solo devuelve sus propias partidas" do
    sign_in_as @limitado

    get listado_path

    data = assert_json_list
    refute_empty data
    assert(data.all? { |p| p["user_id"] == @limitado.id })
    assert_equal data.size, json_body["total"],
                 "El total tiene que reflejar el conteo YA filtrado, no el del centro"
    assert_equal 1, json_body["total"]
  end

  test "get_expense_budgets siendo dueno del centro sin Ver todos devuelve todas las partidas" do
    sign_in_as @dueno

    get listado_path

    ids = assert_json_list.map { |p| p["id"] }
    assert_includes ids, @partida.id, "El dueno del centro ve la partida de otro beneficiario"
    assert_includes ids, @partida_contador.id
  end

  test "get_expense_budgets con Ver todos devuelve todas las partidas del centro" do
    sign_in_as @admin
    get listado_path
    ids_admin = assert_json_list.map { |p| p["id"] }.sort

    sign_out_current
    sign_in_as @pleno
    get listado_path
    ids_pleno = assert_json_list.map { |p| p["id"] }.sort

    assert_equal ids_admin, ids_pleno
  end

  test "get_expense_budgets tope per_page en 100" do
    sign_in_as @admin

    get listado_path, params: { per_page: 500 }

    assert_operator assert_json_list.size, :<=, 100
  end

  test "get_expense_budgets per_page invalido no revienta" do
    sign_in_as @admin

    ["0", "abc"].each do |valor|
      get listado_path, params: { per_page: valor }
      # `.to_i` de un texto es 0 y will_paginate dividiria por cero.
      assert_operator assert_json_list.size, :>=, 1, "per_page=#{valor} rompio el listado"
    end
  end

  test "get_expense_budgets ordena por user_name sin colision de alias" do
    sign_in_as @admin

    get listado_path, params: { sort: "user_name", dir: "asc" }

    # ESTE TEST EXISTE PARA ATRAPAR EL `ORDER BY users.names` AMBIGUO:
    # ExpenseBudget tiene TRES asociaciones a users (user, created_by,
    # last_user_edited). Sin el alias literal `beneficiaries`, Rails aliasea a su
    # gusto y el orden sale por el creador o revienta con PG::UndefinedTable.
    nombres = assert_json_list.map { |p| p["user"]["names"] }
    assert_equal nombres.sort, nombres
  end

  test "get_expense_budgets ordena por amount desc por defecto de dir" do
    sign_in_as @admin

    get listado_path, params: { sort: "amount" }

    montos = assert_json_list.map { |p| p["amount"].to_d }
    assert_equal montos.max, montos.first
    assert_equal montos.sort.reverse, montos
  end

  test "get_expense_budgets con sort desconocido cae a created_at desc" do
    sign_in_as @admin

    # `params[:sort]` termina dentro de un Arel.sql, que no escapa nada.
    get listado_path, params: { sort: "drop_table" }

    assert_response :success
    fechas = assert_json_list.map { |p| Time.zone.parse(p["created_at"].to_s) }
    assert_equal fechas.sort.reverse, fechas
  end

  test "get_expense_budgets q filtra por notes" do
    sign_in_as @admin

    get listado_path, params: { q: "Ampliacion" }

    assert_equal 1, json_body["total"]
    assert_equal @partida_segunda.id, assert_json_list.first["id"]
  end

  test "get_expense_budgets q filtra por nombre del beneficiario" do
    sign_in_as @admin

    get listado_path, params: { q: users(:contador).names }

    data = assert_json_list
    refute_empty data
    assert(data.all? { |p| p["user_id"] == users(:contador).id })
  end

  test "get_expense_budgets q y sort user_name juntos no duplican el join" do
    sign_in_as @admin

    # Si el INNER JOIN a `beneficiaries` se aplicara una vez por `q` y otra por
    # `sort`, Postgres responderia PG::DuplicateAlias y esto seria un 500.
    get listado_path, params: { q: "a", sort: "user_name", dir: "asc" }

    assert_response :success
    assert_kind_of Array, json_body["data"]
  end

  test "get_expense_budgets only_active true excluye inactivas" do
    sign_in_as @admin

    get listado_path, params: { only_active: "true" }

    data = assert_json_list
    refute_empty data
    assert(data.none? { |p| p["active"] == false })
    refute_includes data.map { |p| p["id"] }, @partida_inactiva.id
  end

  test "get_expense_budgets only_active false devuelve solo inactivas" do
    sign_in_as @admin

    # `.present?` y no `.nil?` en el guard del controller: "false" es present? y
    # tiene que filtrar. Con `.nil?` este caso devolveria todo.
    get listado_path, params: { only_active: "false" }

    data = assert_json_list
    refute_empty data
    assert(data.all? { |p| p["active"] == false })
    assert_equal [@partida_inactiva.id], data.map { |p| p["id"] }
  end

  test "get_expense_budgets con centro inexistente responde type error" do
    sign_in_as @admin

    get "/get_expense_budgets/999999"

    assert_json_error(incluye: "El centro de costos no existe")
  end

  test "get_expense_budgets no hace una query por fila" do
    sign_in_as @admin
    # El login y la lectura de permisos ya ocurrieron: lo que se cuenta es solo
    # el request del listado.
    get listado_path
    assert_operator assert_json_list.size, :>=, 5, "el centro debe tener 5 partidas para que la medicion valga"

    consultas = contar_queries { get listado_path }

    assert_operator consultas.size, :<, 15,
                    "Serializar 5 partidas costo #{consultas.size} consultas. Caso tipico: " \
                    "`spent`/`available` resueltos dentro del serializer en vez de precargados.\n" \
                    "#{consultas.join("\n")}"
  end

  # =========================================================================
  # A.3 — get_expense_budget_summary
  # =========================================================================

  test "get_expense_budget_summary devuelve cost_center totals y by_user" do
    sign_in_as @admin

    get resumen_path

    assert_response :success
    assert_equal %w[cost_center totals by_user].sort, json_body.keys.sort
    assert_equal %w[viatic_value assigned unassigned spent available].sort,
                 json_body["totals"].keys.sort
    assert_kind_of Array, json_body["by_user"]
    assert_equal %w[user_id user_name assigned spent available budgets_count exceeded_expenses_count].sort,
                 json_body["by_user"].first.keys.sort
  end

  test "get_expense_budget_summary unassigned es viatic_value menos assigned" do
    sign_in_as @admin

    get resumen_path

    totales = json_body["totals"]
    assert_equal totales["viatic_value"].to_d - totales["assigned"].to_d,
                 totales["unassigned"].to_d
  end

  test "get_expense_budget_summary sin permiso 403" do
    sign_in_as @sin_permisos

    get resumen_path

    assert_json_forbidden
  end

  test "get_expense_budget_summary sin Ver todos filtra by_user a la propia fila" do
    sign_in_as @limitado

    get resumen_path

    assert_equal 1, json_body["by_user"].size
    assert_equal @limitado.id, json_body["by_user"].first["user_id"]
    # `totals` se devuelve COMPLETO: son cifras del centro, que esa persona ya ve
    # en la pestana de resumen. Lo que se recorta es el detalle por persona.
    assert_equal @centro.viatic_value.to_d, json_body["totals"]["viatic_value"].to_d
  end

  test "get_expense_budget_summary con centro inexistente responde type error" do
    sign_in_as @admin

    get "/get_expense_budget_summary/999999"

    assert_json_error(incluye: "El centro de costos no existe")
  end

  # =========================================================================
  # A.4 — get_expense_budget_available
  # =========================================================================

  test "get_expense_budget_available devuelve has_budget true con montos" do
    sign_in_as @admin

    get "/get_expense_budget_available", params: { cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id }

    assert_response :success
    assert_equal true, json_body["has_budget"]
    # 500.000 + 200.000 activas; la inactiva de 900.000 no aporta un peso.
    assert_equal BigDecimal("700000"), json_body["assigned"].to_d
    assert_equal BigDecimal("200000"), json_body["spent"].to_d
    assert_equal BigDecimal("500000"), json_body["available"].to_d
  end

  test "get_expense_budget_available devuelve has_budget false y ceros" do
    sign_in_as @admin

    get "/get_expense_budget_available", params: { cost_center_id: @centro_ajeno.id,
                                                   user_id: users(:ingeniero).id }

    assert_equal false, json_body["has_budget"]
    # Los tres montos en "0.0" y NUNCA en nil: el frontend hace parseFloat sobre
    # ellos y parseFloat(null) es NaN.
    %w[assigned spent available].each do |clave|
      refute_nil json_body[clave], "#{clave} llego en nil"
      assert_equal "0.0", json_body[clave].to_s
    end
  end

  test "get_expense_budget_available respeta exclude_expense_id" do
    sign_in_as @admin
    gasto = report_expenses(:one)   # 100.000, centro_con_viaticos / ingeniero

    get "/get_expense_budget_available", params: { cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id }
    sin_excluir = json_body["available"].to_d

    get "/get_expense_budget_available", params: { cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id,
                                                   exclude_expense_id: gasto.id }

    # Sube EXACTAMENTE el invoice_value del gasto excluido: sin esto, cualquier
    # edicion al alza de un gasto quedaria excedida contra si misma.
    assert_equal sin_excluir + gasto.invoice_value.to_d, json_body["available"].to_d
  end

  test "get_expense_budget_available sin cost_center_id responde type error" do
    sign_in_as @admin

    get "/get_expense_budget_available", params: { user_id: users(:ingeniero).id }

    # 200 con type error, no 400 ni 500.
    assert_json_error
  end

  test "get_expense_budget_available sin user_id responde type error" do
    sign_in_as @admin

    get "/get_expense_budget_available", params: { cost_center_id: @centro.id }

    assert_json_error
  end

  test "get_expense_budget_available es accesible sin permisos de Presupuesto" do
    sign_in_as @sin_permisos

    get "/get_expense_budget_available", params: { cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id }

    # DOCUMENTA LA DECISION DE §3 A.4: el formulario de gastos necesita el
    # disponible y lo usa gente que no entra al modulo de Presupuesto. Si alguien
    # "endurece" el endpoint, este test falla y obliga a revisar el contrato con
    # el cliente en vez de romper el formulario en silencio.
    assert_response :success
    assert_equal true, json_body["has_budget"]
  end

  test "get_expense_budget_available sin sesion redirige al login" do
    get "/get_expense_budget_available", params: { cost_center_id: @centro.id,
                                                   user_id: users(:ingeniero).id }

    assert_redirected_to new_user_session_path
  end

  # =========================================================================
  # A.5 — create
  # =========================================================================

  def params_create(**overrides)
    { cost_center_id: @centro.id, user_id: users(:ingeniero).id,
      amount: 100_000, notes: "Partida nueva" }.merge(overrides)
  end

  test "create crea la partida y responde register serializado" do
    sign_in_as @pleno

    assert_difference -> { ExpenseBudget.count }, 1 do
      post expense_budgets_path, params: params_create
    end

    registro = assert_json_success
    refute_nil registro["id"]
    assert_equal "100000.0", registro["amount"].to_s
  end

  test "create asigna created_by_id al usuario de la sesion" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create

    assert_equal @pleno.id, ExpenseBudget.order(:id).last.created_by_id
  end

  test "create usa el user_id del body como beneficiario y no el de la sesion" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create(user_id: users(:ingeniero).id)

    # PROTEGE LA EXCEPCION DE NOMENCLATURA DE §1.1: `user_id` es el BENEFICIARIO.
    # Un `reverse_merge(user_id: current_user.id)` como el de los gastos le daria
    # al jefe el presupuesto de todo su equipo, y el error es silencioso: la
    # partida se crea y la pantalla se ve bien.
    assert_equal users(:ingeniero).id, ExpenseBudget.order(:id).last.user_id
    refute_equal @pleno.id, ExpenseBudget.order(:id).last.user_id
  end

  test "create sin permiso Crear responde 403 y no crea" do
    sign_in_as @sin_permisos

    assert_no_difference -> { ExpenseBudget.count } do
      post expense_budgets_path, params: params_create
    end

    assert_json_forbidden
  end

  test "create sin ser dueno y sin Ver todos responde 403" do
    sign_in_as @limitado

    assert_no_difference -> { ExpenseBudget.count } do
      post expense_budgets_path, params: params_create
    end

    mensajes = assert_json_forbidden
    assert_includes mensajes.first, "Solo el responsable del centro de costos"
  end

  test "create siendo dueno del centro sin Ver todos crea" do
    sign_in_as @dueno

    assert_difference -> { ExpenseBudget.count }, 1 do
      post expense_budgets_path, params: params_create
    end

    assert_json_success
  end

  test "create siendo dueno de otro centro responde 403 en el centro ajeno" do
    sign_in_as @dueno

    post expense_budgets_path, params: params_create(cost_center_id: @centro_ajeno.id)

    assert_json_forbidden
  end

  test "create verifica el permiso antes que la existencia del centro" do
    sign_in_as @sin_permisos

    post expense_budgets_path, params: params_create(cost_center_id: 999_999)

    # 403 y NO "el centro no existe": al reves, el endpoint seria un oraculo para
    # averiguar que centros existen sin tener permiso.
    assert_json_forbidden
  end

  test "create con centro inexistente responde type error" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create(cost_center_id: 999_999)

    assert_json_error(incluye: "El centro de costos no existe")
  end

  test "create que supera el tope responde error con el disponible" do
    sign_in_as @pleno

    assert_no_difference -> { ExpenseBudget.count } do
      post expense_budgets_path, params: params_create(amount: 90_000_000)
    end

    mensajes = assert_json_error(incluye: "supera el valor de viáticos")
    assert(mensajes.any? { |m| m.include?("Disponible para asignar") })
  end

  test "create sobre centro con viatic_value nil responde el mensaje correcto" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create(cost_center_id: @centro_sin_viaticos.id)

    assert_json_error(incluye: "no tiene valor de viáticos cotizado")
  end

  test "create acepta amount con formato de moneda" do
    sign_in_as @pleno

    # El formulario manda "$1,000,000" desde NumberFormat.
    post expense_budgets_path, params: params_create(amount: "$1,000,000")

    assert_json_success
    assert_equal BigDecimal("1000000"), ExpenseBudget.order(:id).last.amount
  end

  test "create ignora created_by_id y last_user_edited_id del body" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create(created_by_id: users(:contador).id,
                                                     last_user_edited_id: users(:contador).id)

    creada = ExpenseBudget.order(:id).last
    assert_equal @pleno.id, creada.created_by_id
    refute_equal users(:contador).id, creada.created_by_id
  end

  test "create ignora active del body" do
    sign_in_as @pleno

    post expense_budgets_path, params: params_create(active: false)

    assert ExpenseBudget.order(:id).last.active,
           "Una partida no puede nacer anulada desde el body"
  end

  test "create sin sesion redirige al login" do
    assert_no_difference -> { ExpenseBudget.count } do
      post expense_budgets_path, params: params_create
    end

    assert_response :redirect
  end

  # =========================================================================
  # A.6 — update
  # =========================================================================

  test "update cambia amount y notes" do
    sign_in_as @pleno

    patch expense_budget_path(@partida), params: { amount: 400_000, notes: "Ajustada" }

    assert_json_success
    @partida.reload
    assert_equal BigDecimal("400000"), @partida.amount
    assert_equal "Ajustada", @partida.notes
  end

  test "update no permite cambiar cost_center_id" do
    sign_in_as @pleno

    patch expense_budget_path(@partida), params: { cost_center_id: @centro_ajeno.id, amount: 400_000 }

    # Mover una partida de centro cambiaria retroactivamente el cupo de DOS pares
    # y dejaria gastos imputados a una partida que ya no les corresponde.
    assert_response :success
    assert_equal @centro.id, @partida.reload.cost_center_id
  end

  test "update no permite cambiar user_id" do
    sign_in_as @pleno

    patch expense_budget_path(@partida), params: { user_id: users(:contador).id, amount: 400_000 }

    assert_response :success
    assert_equal users(:ingeniero).id, @partida.reload.user_id
  end

  test "update sin permiso Editar responde 403" do
    sign_in_as @sin_permisos

    patch expense_budget_path(@partida), params: { amount: 1 }

    assert_json_forbidden
    assert_equal BigDecimal("500000"), @partida.reload.amount
  end

  test "update sin ser dueno y sin Ver todos responde 403" do
    sign_in_as @limitado

    patch expense_budget_path(@partida), params: { amount: 1 }

    assert_json_forbidden
    assert_equal BigDecimal("500000"), @partida.reload.amount
  end

  test "update reduciendo amount por debajo de lo gastado se permite" do
    sign_in_as @pleno
    # Se anula la segunda partida del par para que el cupo del par sea SOLO el de
    # la partida que se va a reducir; si no, los 200.000 de la otra alcanzan para
    # los gastos y nada quedaria excedido.
    @partida_segunda.update_columns(active: false)
    gasto = report_expenses(:one)
    gasto.update_columns(budget_status: "aprobado", expense_budget_id: @partida.id)

    patch expense_budget_path(@partida), params: { amount: 1 }

    assert_json_success
    # El reevaluo del servicio se invoco DESDE el controller: reducir el monto
    # por debajo de lo gastado se permite (si no, el jefe no podria corregir una
    # partida inflada por error) y los gastos que ya no caben pasan a excedido.
    assert_equal "excedido", gasto.reload.budget_status
    refute_empty gasto.budget_reason.to_s
  end

  # =========================================================================
  # A.6 — anulacion (`active: false`), los tres casos de la regla de negocio
  #
  # No hay endpoint propio: el boton "Anular" de la tabla manda un PATCH al mismo
  # update. Ojo con el tipo: en un request form-encoded `active` llega como el
  # STRING "false", que sin castear es truthy en Ruby.
  # =========================================================================

  test "update active false sin gasto ejecutado anula la partida" do
    sign_in_as @pleno

    # El contador no tiene gastos en el centro: su partida no tiene nada
    # ejecutado y se anula entera.
    patch expense_budget_path(@partida_contador), params: { active: false }

    assert_json_success
    refute @partida_contador.reload.active
    assert_equal BigDecimal("300000"), @partida_contador.amount
    assert_includes json_body["success"], "se liberaron $300.000"
  end

  test "update active false con gasto parcial recorta el monto y la deja activa" do
    sign_in_as @pleno
    # El par (centro_con_viaticos, ingeniero) tiene 200.000 gastados en fixtures.

    patch expense_budget_path(@partida), params: { active: false }

    assert_json_success
    @partida.reload
    # ACTIVA a proposito: `cap_violation_for` suma solo partidas activas, asi que
    # desactivarla sacaria del tope del centro los 200.000 ya ejecutados.
    assert @partida.active, "Una partida con gasto ejecutado no se desactiva, se recorta"
    assert_equal BigDecimal("200000"), @partida.amount
    assert_includes json_body["success"], "se recortó de $500.000 a $200.000"
  end

  test "update active false sin saldo por liberar no cambia nada y lo informa" do
    sign_in_as @pleno
    # 200.000 asignados y 200.000 ya gastados por el par: no hay nada que liberar.

    patch expense_budget_path(@partida_segunda), params: { active: false }

    assert_response :success
    assert_equal "error", json_body["type"]
    assert_includes json_body["message"].join(" "), "no hay saldo por liberar"
    @partida_segunda.reload
    assert @partida_segunda.active
    assert_equal BigDecimal("200000"), @partida_segunda.amount
  end

  test "update con id inexistente responde 404" do
    sign_in_as @pleno

    # `ExpenseBudget.find` levanta RecordNotFound, que Rails traduce a 404. No se
    # captura a proposito: no hay nada util que decirle al cliente.
    assert_raises(ActiveRecord::RecordNotFound) do
      patch expense_budget_path(999_999), params: { amount: 1 }
    end
  end

  # =========================================================================
  # A.7 — destroy
  # =========================================================================

  test "destroy elimina y responde type delete" do
    sign_in_as @pleno

    assert_difference -> { ExpenseBudget.count }, -1 do
      delete expense_budget_path(@partida)
    end

    # `type: "delete"` y no "success": es lo que el frontend usa para sacar la
    # fila de la tabla sin recargar la pagina.
    assert_response :success
    assert_equal "delete", json_body["type"]
  end

  test "destroy sin permiso Eliminar responde 403 y no elimina" do
    sign_in_as @sin_permisos

    assert_no_difference -> { ExpenseBudget.count } do
      delete expense_budget_path(@partida)
    end

    assert_json_forbidden
  end

  test "destroy sin ser dueno responde 403" do
    sign_in_as @limitado

    assert_no_difference -> { ExpenseBudget.count } do
      delete expense_budget_path(@partida)
    end

    assert_json_forbidden
  end

  test "destroy siendo dueno del centro sin Ver todos elimina" do
    sign_in_as @dueno

    assert_difference -> { ExpenseBudget.count }, -1 do
      delete expense_budget_path(@partida)
    end

    assert_equal "delete", json_body["type"]
  end

  test "destroy deja los gastos imputados con expense_budget_id nil" do
    sign_in_as @pleno
    # El contador tiene UNA sola partida en el centro: al borrarla no queda
    # ninguna activa del par y el gasto no puede reimputarse a otra.
    gasto = as_user(@admin) do
      ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro, user_invoice: users(:contador),
                            invoice_name: "Gasto imputado", invoice_date: Date.new(2026, 6, 1),
                            invoice_number: "FE-IMP-1", identification: "900111222",
                            invoice_value: 50_000, invoice_tax: 0, invoice_total: 50_000)
    end
    gasto.update_columns(budget_status: "aprobado", expense_budget_id: @partida_contador.id)

    delete expense_budget_path(@partida_contador)

    assert_equal "delete", json_body["type"]
    assert_nil gasto.reload.expense_budget_id
    assert_equal "sin_presupuesto", gasto.budget_status
  end

  # =========================================================================
  # Transversal
  # =========================================================================

  test "todos los endpoints exigen autenticacion" do
    peticiones = [
      -> { get listado_path },
      -> { get resumen_path },
      -> { get "/get_expense_budget_available", params: { cost_center_id: @centro.id, user_id: users(:ingeniero).id } },
      -> { post expense_budgets_path, params: params_create },
      -> { patch expense_budget_path(@partida), params: { amount: 1 } },
      -> { delete expense_budget_path(@partida) }
    ]

    peticiones.each_with_index do |peticion, i|
      peticion.call
      assert_response :redirect, "El endpoint #{i} no exige sesion"
    end
  end

  test "los cinco endpoints de modulo responden 403 al usuario sin permisos" do
    sign_in_as @sin_permisos

    # Criterio 6 del paquete 07: cinco endpoints, cinco 403 con cuerpo JSON.
    # `get_expense_budget_available` queda FUERA a proposito (criterio 7).
    peticiones = [
      -> { get listado_path },
      -> { get resumen_path },
      -> { post expense_budgets_path, params: params_create },
      -> { patch expense_budget_path(@partida), params: { amount: 1 } },
      -> { delete expense_budget_path(@partida) }
    ]

    peticiones.each_with_index do |peticion, i|
      peticion.call
      assert_response :forbidden, "El endpoint #{i} no respondio 403"
      assert_equal "error", json_body["type"]
      assert_kind_of Array, json_body["message"]
    end
  end

  test "no existe la ruta GET expense_budgets index" do
    # Una partida no tiene sentido fuera de su centro, y un listado global seria
    # una fuga de datos entre proyectos.
    assert_raises(ActionController::RoutingError) do
      get "/expense_budgets"
    end
  end
end
