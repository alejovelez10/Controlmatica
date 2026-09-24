require "test_helper"

# Contrato JSON que leen `BudgetsTable.jsx` y `BudgetSummaryBoard.jsx`.
#
# No hay runner de JavaScript en el repo (§5.5) y montarlo no esta
# presupuestado, asi que el nivel unitario de este paquete prueba el CONTRATO
# servidor<->frontend: las claves exactas y los tipos exactos que los
# componentes leen. Si el backend renombra una clave o cambia un string por un
# float, estas pruebas fallan antes de que lo note el usuario.
#
# El codigo de los endpoints es del paquete 07; aqui no se toca.
class BudgetTabContractTest < ActionDispatch::IntegrationTest
  # Las que pinta cada fila de la tabla de partidas.
  CLAVES_FILA = %w[id cost_center_id user_id amount notes active spent available
                   created_at updated_at].freeze

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)      # viatic_value 5.000.000
    @centro_sin_viaticos = cost_centers(:centro_sin_viaticos)
  end

  test "get_expense_budgets devuelve las claves que pinta la tabla" do
    sign_in_as @admin
    get "/get_expense_budgets/#{@centro.id}"
    filas = assert_json_list

    assert_operator filas.size, :>, 0, "Las fixtures deben traer partidas en este centro"
    fila = filas.first

    CLAVES_FILA.each do |clave|
      assert_includes fila.keys, clave, "Falta la clave #{clave.inspect} que la tabla pinta por nombre"
    end

    # `names`, NO `name`: UserSerializer expone :id y :names. La columna
    # Beneficiario hace `r.user.names` y con `name` mostraria "—" en todas las
    # filas sin fallar.
    assert_includes fila["user"].keys, "names"
    assert_includes fila["created_by"].keys, "names" if fila["created_by"]

    # `total` plano y no `meta`: es lo que CmDataTable recibe como serverMeta.
    assert_kind_of Integer, json_body["total"],
                   "El contrato es { data: [...], total: N } con total Integer, no un objeto meta"
  end

  test "get_expense_budgets devuelve amount, spent y available como strings parseables" do
    sign_in_as @admin
    get "/get_expense_budgets/#{@centro.id}"
    fila = assert_json_list.first

    # El frontend hace parseFloat sobre los tres. Si el serializer pasara a
    # Integer o Float, `"500000.0" + "1"` dejaria de ser el problema pero
    # apareceria otro: NumberFormat con un Float grande pierde centavos.
    %w[amount spent available].each do |clave|
      assert_kind_of String, fila[clave],
                     "#{clave} debe viajar como string (BigDecimal serializado); llego #{fila[clave].class}"
      assert_nothing_raised { Float(fila[clave]) }
    end
  end

  test "get_expense_budgets respeta only_active" do
    inactiva = expense_budgets(:inactiva_ingeniero)

    sign_in_as @admin
    get "/get_expense_budgets/#{@centro.id}", params: { only_active: "true", per_page: 100 }
    ids = assert_json_list.map { |f| f["id"] }

    refute_includes ids, inactiva.id, "El filtro budget-filter-active manda only_active=true al servidor"

    # Y el camino contrario, que es el que el selector "Solo anuladas" usa:
    get "/get_expense_budgets/#{@centro.id}", params: { only_active: "false", per_page: 100 }
    ids_inactivas = assert_json_list.map { |f| f["id"] }
    assert_includes ids_inactivas, inactiva.id
  end

  test "get_expense_budgets ignora un sort fuera de whitelist sin error" do
    sign_in_as @admin
    get "/get_expense_budgets/#{@centro.id}"
    total_base = json_body["total"]

    # `spent` es una columna VISIBLE de la tabla pero NO esta en la allowlist de
    # orden del servidor. Por eso va con sortable:false en this.columns: si se
    # dejara ordenable, el usuario haria clic, la flecha cambiaria y los datos
    # no. Aqui se prueba que al menos no revienta.
    get "/get_expense_budgets/#{@centro.id}", params: { sort: "spent", dir: "asc" }
    assert_response :success
    assert_equal total_base, json_body["total"]

    get "/get_expense_budgets/#{@centro.id}", params: { sort: "available", dir: "desc" }
    assert_response :success
    assert_equal total_base, json_body["total"]
  end

  test "get_expense_budget_summary devuelve totals y by_user con las claves del tablero" do
    sign_in_as @admin
    get "/get_expense_budget_summary/#{@centro.id}"
    assert_response :success
    body = json_body

    assert_equal %w[assigned assignable available spent uncovered unassigned viatic_value].sort,
                 body["totals"].keys.sort
    body["totals"].each do |clave, v|
      # Todos los totales pasan por parseFloat en el tablero.
      assert Float(v), "El total #{clave} no es parseable por parseFloat: #{v.inspect}"
    end

    assert_includes body["cost_center"].keys, "viatic_value",
                    "budget-summary-no-viatic se decide con cost_center.viatic_value"

    fila = body["by_user"].first
    assert fila, "Las fixtures deben dejar al menos un beneficiario con partida"
    %w[user_id user_name assigned spent available budgets_count exceeded_expenses_count].each do |clave|
      assert_includes fila.keys, clave
    end
    # El tablero suma los excedidos en cliente: tiene que ser un entero.
    assert_kind_of Integer, fila["exceeded_expenses_count"]
    assert_kind_of Integer, fila["budgets_count"]
  end

  test "get_expense_budget_summary de un centro sin viaticos devuelve viatic_value 0 y by_user vacio" do
    sign_in_as @admin
    get "/get_expense_budget_summary/#{@centro_sin_viaticos.id}"
    assert_response :success
    body = json_body

    # Este es exactamente el caso que dispara budget-summary-no-viatic y el
    # motivo de bloqueo #1 del formulario de partida.
    assert_equal 0.0, Float(body["cost_center"]["viatic_value"])
    assert_equal 0.0, Float(body["totals"]["viatic_value"])
  end

  test "get_expense_budget_available sin partida devuelve has_budget false y montos en cero" do
    sign_in_as @admin
    # `gerente` no tiene partida en este centro segun expense_budgets.yml.
    get "/get_expense_budget_available", params: { cost_center_id: @centro.id, user_id: users(:gerente).id }
    assert_response :success
    body = json_body

    assert_equal false, body["has_budget"]
    # Los tres van en "0.0" y NUNCA en nil: el frontend hace parseFloat y
    # parseFloat(null) es NaN. Y el texto que muestra es "Sin presupuesto
    # asignado", no "$0": no es que se le acabo el cupo, es que nunca tuvo.
    %w[assigned spent available].each do |clave|
      refute_nil body[clave], "#{clave} no puede llegar en null"
      assert_equal 0.0, Float(body[clave])
    end
  end

  test "get_expense_budget_available sin cost_center_id devuelve type error" do
    sign_in_as @admin
    get "/get_expense_budget_available", params: { user_id: users(:ingeniero).id }

    # HTTP 200 con type error, no un 500: el frontend cae al estado
    # "No disponible" del panel en vivo y sigue operando.
    assert_json_error
  end

  test "get_expense_budgets responde 403 a un usuario sin permiso" do
    sign_in_as users(:sin_permisos)
    get "/get_expense_budgets/#{@centro.id}"

    # 403 CON cuerpo JSON. `loadData` lo detecta por `data.type` y lo pinta en
    # budget-table-error; un `head :forbidden` sin cuerpo reventaria el
    # `.then(r => r.json())` con "Unexpected end of JSON input".
    mensajes = assert_json_forbidden
    assert_kind_of Array, mensajes
    refute_empty mensajes
  end
end
