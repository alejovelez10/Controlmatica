require "test_helper"

# La pantalla de reglas guarda a quien y a que tipos aplica la regla, y si
# prohibe el gasto (2026-10-14). Lo que se prueba aqui es el CABLEADO HTTP: que
# las listas lleguen, que el modo de roles deje una sola lista viva y que una
# validacion fallida no deje las listas cambiadas a medias. La logica de
# resolucion la cubre test/models/expense_rule_alcance_test.rb.
class ExpenseRulesAlcanceControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @representacion = ReportExpenseOption.create!(name: "Representación", category: "Tipo",
                                                  user_id: @admin.id)
    @alimentacion = report_expense_options(:opcion_tipo)
    ExpenseRule.update_all(active: false)
    sign_in_as @admin
  end

  def params_regla(**overrides)
    { name: "Representación restringida", active: true, is_default: false,
      check_duplicates: false, mandatory: true, agent_instructions: "" }.merge(overrides)
  end

  test "crear guarda el modo, las excepciones, los tipos y la prohibicion" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, prohibits_expense: true,
      excluded_rol_ids: [users(:gerente).rol_id], excluded_user_ids: [users(:ingeniero).id],
      included_type_ids: [@representacion.id], excluded_type_ids: []
    )

    assert_equal "success", JSON.parse(response.body)["type"], response.body
    r = ExpenseRule.order(:id).last
    assert r.applies_to_all_roles
    assert r.prohibits_expense
    assert_equal [users(:gerente).rol_id], r.excluded_rols.map(&:id)
    assert_equal [users(:ingeniero).id], r.excluded_users.map(&:id)
    assert_equal [@representacion.id], r.included_types.map(&:id)
  end

  # Si quedaran las dos listas, la pantalla mostraria una y la base guardaria
  # otra que nadie ve.
  test "con todos los roles se vacia la lista de solo estos roles" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, rol_ids: [users(:ingeniero).rol_id],
      excluded_rol_ids: [users(:gerente).rol_id]
    )

    r = ExpenseRule.order(:id).last
    assert_empty r.rols
    assert_equal [users(:gerente).rol_id], r.excluded_rols.map(&:id)
  end

  test "con solo estos roles se vacia la lista de excluidos" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: false, rol_ids: [users(:ingeniero).rol_id],
      excluded_rol_ids: [users(:gerente).rol_id]
    )

    r = ExpenseRule.order(:id).last
    assert_equal [users(:ingeniero).rol_id], r.rols.map(&:id)
    assert_empty r.excluded_rols
  end

  test "un medio de pago no entra como tipo de gasto" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, included_type_ids: [report_expense_options(:opcion_pago).id]
    )

    assert_empty ExpenseRule.order(:id).last.included_types
  end

  # En un registro ya guardado, asignar una lista HABTM escribe en la base antes
  # de validar. Sin la transaccion del update, la regla quedaria sin tipos.
  test "una edicion que no pasa la validacion no deja los tipos borrados" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, prohibits_expense: true, included_type_ids: [@representacion.id]
    )
    r = ExpenseRule.order(:id).last

    patch expense_rule_path(r), as: :json, params: { included_type_ids: [] }

    cuerpo = JSON.parse(response.body)
    assert_equal "error", cuerpo["type"]
    assert_match "tipo de gasto que prohibir", cuerpo["message"].join
    assert_equal [@representacion.id], r.reload.included_types.map(&:id)
  end

  test "el listado devuelve las listas nuevas con nombre" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, excluded_user_ids: [users(:ingeniero).id],
      excluded_type_ids: [@representacion.id]
    )

    get "/get_expense_rules"
    fila = JSON.parse(response.body)["data"].find { |x| x["name"] == "Representación restringida" }
    assert_equal true, fila["applies_to_all_roles"]
    assert_equal [{ "id" => @representacion.id, "name" => "Representación" }], fila["excluded_types"]
    assert_equal [users(:ingeniero).id], fila["excluded_users"].map { |u| u["id"] }
    assert_equal ExpenseRule.nombre_de_persona(users(:ingeniero)), fila["excluded_users"].first["name"]
  end

  test "validate_candidate avisa de un tipo prohibido apenas se elige" do
    post expense_rules_path, as: :json, params: params_regla(
      applies_to_all_roles: true, prohibits_expense: true, included_type_ids: [@representacion.id]
    )

    post "/validate_expense_rules", as: :json, params: {
      user_invoice_id: users(:ingeniero).id, type_identification_id: @representacion.id,
      invoice_value: 10_000, invoice_total: 10_000, invoice_date: Date.current.to_s
    }

    cuerpo = JSON.parse(response.body)
    assert_equal ["expense_prohibited"], cuerpo["blocking_violations"].map { |v| v["code"] }
  end

  test "get_expense_rules_for_user filtra por el tipo cuando se lo dan" do
    post expense_rules_path, as: :json, params: params_regla(
      name: "Tope representación", applies_to_all_roles: true, max_invoice_value: 50_000,
      included_type_ids: [@representacion.id]
    )

    get "/get_expense_rules_for_user", params: { user_id: users(:ingeniero).id,
                                                 type_identification_id: @alimentacion.id }
    assert_nil JSON.parse(response.body)["max_invoice_value"]

    get "/get_expense_rules_for_user", params: { user_id: users(:ingeniero).id,
                                                 type_identification_id: @representacion.id }
    assert_equal "50000.0", JSON.parse(response.body)["max_invoice_value"].to_s
  end

  test "las props de la pantalla traen los catalogos de personas y de tipos" do
    get expense_rules_path

    props = JSON.parse(css_select("[data-react-class='ExpenseRuleIndex']").first["data-react-props"])
    assert_includes props["tipos"].map { |t| t["label"] }, "Representación"
    assert_not_includes props["tipos"].map { |t| t["label"] }, "Efectivo"
    assert_includes props["usuarios"].map { |u| u["label"] },
                    ExpenseRule.nombre_de_persona(users(:ingeniero))
  end

  test "una prohibicion no guarda tipos en «Excepto estos»" do
    # En modo prohibir la pantalla no muestra esa lista: si llegara llena, la
    # base guardaria algo que nadie ve.
    sign_in_as @admin
    otro = ReportExpenseOption.create!(name: "Otro tipo", category: "Tipo", user_id: @admin.id)

    post expense_rules_path, as: :json, params: {
      name: "Prohibe con excepto", active: true, applies_to_all_roles: true, prohibits_expense: true,
      included_type_ids: [@representacion.id], excluded_type_ids: [otro.id]
    }

    r = ExpenseRule.find_by!(name: "Prohibe con excepto")
    assert_equal [@representacion.id], r.included_types.map(&:id)
    assert_empty r.excluded_types
  end
end
