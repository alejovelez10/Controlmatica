require "test_helper"

# CRUD de reglas de gastos por HTTP (paquete 14, tarea 5).
#
# La figura que este archivo distingue —y que es la que se rompe sola— es la de
# "solo lectura": alguien con "Ingreso al modulo" pero sin "Crear"/"Editar"/
# "Eliminar". Con un solo usuario administrador, los cuatro gates pasarian
# aunque el controller no revisara ninguno.
class ExpenseRulesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @sin_permisos = users(:sin_permisos)

    # Usuario de SOLO LECTURA: solo "Ingreso al modulo", sin Crear/Editar/
    # Eliminar. Se construye en caliente con un rol PROPIO en vez de agregarlo a
    # rols.yml, que tiene dueno unico (paquete 01, §7.2).
    #
    # OJO: el rol tiene que ser nuevo y no el de `ingeniero_sin_permisos`, que es
    # el MISMO `sin_permisos` que usa el test del 403. Reusarlo le daria permiso
    # al usuario que no debe tenerlo y el gate pasaria por accidente.
    rol_lectura = Rol.create!(name: "Reglas solo lectura", description: "Solo entra al modulo")
    @solo_lectura = users(:ingeniero_sin_permisos)
    @solo_lectura.update_columns(rol_id: rol_lectura.id)
    grant_permission!(rol_lectura, "Reglas de gastos", "Ingreso al modulo")

    @regla = expense_rules(:directivos)
  end

  def params_regla(**overrides)
    { name: "Regla nueva", active: true, is_default: false,
      max_invoice_age_days: 30, max_invoice_value: 500_000,
      check_duplicates: true, agent_instructions: "Sin licores" }.merge(overrides)
  end

  # --- Permisos --------------------------------------------------------------

  test "sin permiso no se entra al modulo" do
    sign_in_as @sin_permisos

    get "/get_expense_rules"

    mensajes = assert_json_forbidden
    assert_kind_of Array, mensajes
  end

  test "con permiso de ingreso se lista" do
    sign_in_as @solo_lectura

    get "/get_expense_rules"

    data = assert_json_list
    refute_empty data
    esperadas = %w[id name active is_default max_invoice_age_days max_invoice_value
                   check_duplicates agent_instructions rol_ids rols]
    assert_equal [], esperadas - data.first.keys
  end

  test "con permiso de solo lectura no se puede crear" do
    sign_in_as @solo_lectura

    assert_no_difference -> { ExpenseRule.count } do
      post expense_rules_path, params: params_regla
    end

    assert_json_forbidden
  end

  test "con permiso de solo lectura no se puede editar ni eliminar" do
    sign_in_as @solo_lectura

    patch expense_rule_path(@regla), params: { name: "Renombrada" }
    assert_json_forbidden
    assert_equal "Regla directivos", @regla.reload.name

    assert_no_difference -> { ExpenseRule.count } do
      delete expense_rule_path(@regla)
    end
    assert_json_forbidden
  end

  test "los cuatro endpoints exigen autenticacion" do
    [-> { get "/get_expense_rules" },
     -> { post expense_rules_path, params: params_regla },
     -> { patch expense_rule_path(@regla), params: { name: "x" } },
     -> { delete expense_rule_path(@regla) }].each_with_index do |peticion, i|
      peticion.call
      assert_response :redirect, "El endpoint #{i} no exige sesion"
    end
  end

  # --- Create ----------------------------------------------------------------

  test "crear una regla asignando usuarios persiste la relacion" do
    sign_in_as @admin

    assert_difference -> { ExpenseRule.count }, 1 do
      post expense_rules_path, params: params_regla(rol_ids: [users(:ingeniero).id, users(:contador).id])
    end

    assert_json_success
    creada = ExpenseRule.order(:id).last
    assert_equal [users(:contador).id, users(:ingeniero).id].sort, creada.rols.map(&:id).sort
    assert_equal @admin.id, creada.user_id, "el creador lo pone el servidor, no el body"
  end

  test "crear sin rol_ids deja la regla sin nadie asignado" do
    sign_in_as @admin

    post expense_rules_path, params: params_regla(is_default: false)

    # UN MULTI-SELECT VACIO SIGNIFICA "NINGUNO", NO "TODOS". Para "todos" esta el
    # switch de regla por defecto. Es la confusion obvia de la pantalla y el
    # servidor la respeta literalmente.
    assert_empty ExpenseRule.order(:id).last.rols
  end

  test "crear una segunda regla por defecto falla con mensaje claro" do
    sign_in_as @admin
    post expense_rules_path, params: params_regla(name: "Regla general", is_default: true)
    assert_json_success

    assert_no_difference -> { ExpenseRule.count } do
      post expense_rules_path, params: params_regla(name: "Otra por defecto", is_default: true)
    end

    mensajes = assert_json_error
    assert(mensajes.any? { |m| m.include?("regla por defecto") },
           "El mensaje no dice cual es el problema: #{mensajes.inspect}")
  end

  test "crear no permite atribuirle la regla a otro usuario" do
    sign_in_as @admin

    post expense_rules_path, params: params_regla(user_id: users(:contador).id,
                                                  last_user_edited_id: users(:contador).id)

    assert_equal @admin.id, ExpenseRule.order(:id).last.user_id
  end

  test "crear con nombre vacio responde type error" do
    sign_in_as @admin

    assert_no_difference -> { ExpenseRule.count } do
      post expense_rules_path, params: params_regla(name: "")
    end

    assert_json_error
  end

  # --- Update ----------------------------------------------------------------

  test "editar quita y agrega usuarios correctamente" do
    sign_in_as @admin
    assert_equal [users(:gerente).id], @regla.rols.map(&:id)

    patch expense_rule_path(@regla), params: { rol_ids: [users(:contador).id, users(:ingeniero).id] }

    assert_json_success
    assert_equal [users(:contador).id, users(:ingeniero).id].sort, @regla.reload.rols.map(&:id).sort
    refute_includes @regla.rols.map(&:id), users(:gerente).id
  end

  test "editar con rol_ids vacio deja la regla sin nadie" do
    sign_in_as @admin

    patch expense_rule_path(@regla), params: { rol_ids: [] }

    assert_json_success
    assert_empty @regla.reload.rols
  end

  test "editar sin mandar rol_ids no toca la asignacion" do
    sign_in_as @admin

    # `params.key?` y no `.present?`: si se usara `.present?`, mandar la lista
    # vacia (operacion legitima) seria indistinguible de no mandar el campo.
    patch expense_rule_path(@regla), params: { name: "Regla directivos renombrada" }

    assert_json_success
    assert_equal [users(:gerente).id], @regla.reload.rols.map(&:id)
    assert_equal "Regla directivos renombrada", @regla.name
  end

  test "editar cambia los limites deterministas" do
    sign_in_as @admin

    patch expense_rule_path(@regla), params: { max_invoice_age_days: 7, max_invoice_value: 100_000,
                                               check_duplicates: false }

    assert_json_success
    @regla.reload
    assert_equal 7, @regla.max_invoice_age_days
    assert_equal BigDecimal("100000"), @regla.max_invoice_value
    refute @regla.check_duplicates
  end

  test "editar con id inexistente responde 404" do
    sign_in_as @admin

    assert_raises(ActiveRecord::RecordNotFound) do
      patch expense_rule_path(999_999), params: { name: "x" }
    end
  end

  # --- Destroy ---------------------------------------------------------------

  test "eliminar responde type delete" do
    sign_in_as @admin

    assert_difference -> { ExpenseRule.count }, -1 do
      delete expense_rule_path(@regla)
    end

    assert_equal "delete", json_body["type"]
  end

  # --- Auditoria -------------------------------------------------------------

  test "toda operacion deja registro en RegisterEdit" do
    sign_in_as @admin

    assert_difference -> { RegisterEdit.where(module: "Reglas de gastos").count }, 1 do
      post expense_rules_path, params: params_regla(name: "Regla auditada")
    end
    creada = ExpenseRule.order(:id).last

    assert_difference -> { RegisterEdit.where(module: "Reglas de gastos").count }, 1 do
      patch expense_rule_path(creada), params: { max_invoice_age_days: 3 }
    end

    assert_difference -> { RegisterEdit.where(module: "Reglas de gastos").count }, 1 do
      delete expense_rule_path(creada)
    end

    tipos = RegisterEdit.where(module: "Reglas de gastos").order(:id).last(3).map(&:type_edit)
    assert_equal %w[creo edito elimino], tipos
  end

  # --- Limites resueltos de un usuario ---------------------------------------

  test "get_expense_rules_for_user devuelve los limites ya combinados" do
    sign_in_as @admin

    get "/get_expense_rules_for_user", params: { user_id: users(:gerente).id }

    assert_response :success
    cuerpo = json_body
    # `directivos` (30 días, tope 2.000.000, duplicados sí) combinada con
    # `directivos_estricta` (15 días, sin tope, duplicados no): gana lo mas
    # restrictivo de cada limite por separado.
    assert_equal 15, cuerpo["max_invoice_age_days"]
    assert_equal BigDecimal("2000000"), cuerpo["max_invoice_value"].to_d
    assert_equal true, cuerpo["check_duplicates"]
    assert_equal ["Regla directivos", "Regla directivos estricta"], cuerpo["applied_rules"].sort
    # Lo semantico sale aparte de lo determinista para que quien lo consuma no
    # tenga que adivinar cual de los dos evalua el servidor.
    assert_includes cuerpo["agent_instructions"], "licores"
    assert_includes cuerpo["agent_instructions"], "propinas"
  end

  test "get_expense_rules_for_user sin reglas devuelve todo en nil" do
    sign_in_as @admin

    get "/get_expense_rules_for_user", params: { user_id: users(:contador).id }

    assert_response :success
    assert_nil json_body["max_invoice_age_days"]
    assert_nil json_body["max_invoice_value"]
    assert_equal false, json_body["check_duplicates"]
    assert_empty json_body["applied_rules"]
  end

  test "get_expense_rules_for_user es accesible sin permisos del modulo" do
    sign_in_as @sin_permisos

    # Igual que `get_expense_budget_available`: lo consume el formulario de
    # gastos, que usa gente que no administra reglas. Si alguien lo endurece,
    # este test falla y obliga a revisar el contrato en vez de romper el
    # formulario en silencio.
    get "/get_expense_rules_for_user"

    assert_response :success
    assert_equal @sin_permisos.id, json_body["user_id"]
  end

  test "get_expense_rules_for_user con usuario inexistente responde type error" do
    sign_in_as @admin

    get "/get_expense_rules_for_user", params: { user_id: 999_999 }

    assert_json_error(incluye: "El usuario no existe")
  end

  # --- Listado ---------------------------------------------------------------

  test "get_expense_rules filtra por only_active" do
    sign_in_as @admin

    get "/get_expense_rules", params: { only_active: "false" }

    data = assert_json_list
    refute_empty data
    assert(data.all? { |r| r["active"] == false })
  end

  test "get_expense_rules busca por nombre y por instrucciones" do
    sign_in_as @admin

    get "/get_expense_rules", params: { q: "estricta" }
    assert_equal 1, json_body["total"]

    get "/get_expense_rules", params: { q: "licores" }
    assert_equal [expense_rules(:directivos).id], assert_json_list.map { |r| r["id"] }
  end

  test "get_expense_rules con sort desconocido no revienta" do
    sign_in_as @admin

    # `params[:sort]` termina dentro de un Arel.sql, que no escapa nada.
    get "/get_expense_rules", params: { sort: "name; DROP TABLE expense_rules" }

    assert_response :success
    assert ExpenseRule.table_exists?
  end
end
