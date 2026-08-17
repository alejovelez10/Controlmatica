require "test_helper"

# TEST DE CONSUMO, no de implementacion.
#
# `app/controllers/cost_centers_controller.rb#show` tiene dueno unico: el
# paquete 07 (00-ARQUITECTURA.md §7.2 y §4.4). Este archivo NO lo implementa ni
# lo modifica. Lo que blinda son las 10 CLAVES CANONICAS de `@estados`, que el
# frontend del paquete 08 lee POR STRING LITERAL:
#
#   - `TabContentShow.jsx` lee `estados.budget_module` para decidir si la pestana
#     Presupuesto existe.
#   - `BudgetsTable.jsx` lee `budget_create/edit/delete/show_all` e
#     `is_center_owner` para esconder botones.
#   - `ExpensesTable.jsx` lee los cuatro `expense_*` desde que se borro el
#     `estados` hardcodeado en true.
#
# Si el 07 renombra una sola de esas claves, la pestana desaparece en silencio:
# no falla nada, no hay error de consola, simplemente deja de estar. Estas
# pruebas son la unica red contra eso.
#
# ⚠️ `assigns` NO existe en Rails 6.1 sin la gema rails-controller-testing, que
# este proyecto no tiene. Se asierta sobre `data-react-props`, que ademas es mas
# fiel: es literalmente el JSON que recibe React.
class CostCentersControllerTest < ActionDispatch::IntegrationTest
  CLAVES_CANONICAS = %w[
    budget_module budget_create budget_edit budget_delete budget_show_all
    is_center_owner
    expense_create expense_edit expense_delete expense_show_all
  ].freeze

  # Las que ya existian antes del paquete 07. El `merge` de §4.4 no puede
  # pisarlas: si desaparecen, se rompen Materiales, Cotizaciones y el boton de
  # editar el centro.
  CLAVES_PREEXISTENTES = %w[
    cost_center_edit update_state show_hours create_materials edit_materials
    edit_all_materials delete_materials update_state_materials
    download_file_materials
  ].freeze

  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)   # user_owner: dueno_centro
    @centro_ajeno = cost_centers(:centro_ajeno)    # user_owner: contador
  end

  # Extrae el hash de props que la vista entrega al componente React.
  def react_props
    nodo = response.body[/data-react-props="([^"]*)"/, 1]
    assert nodo, "La vista no renderizo ningun data-react-props"
    JSON.parse(CGI.unescapeHTML(nodo))
  end

  def estados
    react_props["estados"]
  end

  test "show expone las claves de presupuesto en estados para un admin" do
    sign_in_as @admin
    get cost_center_path(@centro)
    assert_response :success

    CLAVES_CANONICAS.each do |clave|
      assert_includes estados.keys, clave,
                      "Falta la clave canonica #{clave.inspect} en @estados; sin ella el frontend la lee como undefined"
    end

    %w[budget_module budget_create budget_edit budget_delete budget_show_all
       expense_create expense_edit expense_delete expense_show_all].each do |clave|
      assert_equal true, estados[clave],
                   "Un Administrador debe tener #{clave} en true (is_admin? corta antes del permiso)"
    end
  end

  test "show deja budget_module en false para un rol sin el modulo Presupuesto" do
    ingeniero = users(:ingeniero)   # rol Ingeniero: gastos y reportes, sin Presupuesto
    assert_equal "Ingeniero", ingeniero.rol.name

    sign_in_as ingeniero
    get cost_center_path(@centro)
    assert_response :success

    # `has_menu_permission?` devuelve nil (no false) cuando el modulo no esta en
    # el hash de permisos, asi que la clave viaja como null. Para React es
    # exactamente lo mismo —los dos son falsy y la pestana no se pinta—, pero se
    # asierta por falsedad y no por `== false` para no mentir sobre lo que el
    # servidor emite hoy.
    assert_includes estados.keys, "budget_module"
    refute estados["budget_module"], "Un Ingeniero no debe ver el modulo de Presupuesto"
    refute estados["budget_create"], "Un Ingeniero no debe poder crear partidas"

    # Y lo que SI tiene su rol sigue llegando: el test no pasa por casualidad.
    assert_equal true, estados["expense_create"]
    refute estados["expense_show_all"], "El Ingeniero no tiene 'Gastos / Ver todos'"
  end

  test "show marca is_center_owner true solo para el dueno del centro" do
    dueno = users(:dueno_centro)
    assert_equal dueno.id, @centro.user_owner_id, "Fixture cambiada: dueno_centro ya no es el dueno"

    sign_in_as dueno
    get cost_center_path(@centro)
    assert_response :success
    assert_equal true, estados["is_center_owner"]

    # Mismo usuario, centro ajeno: el flag tiene que caerse.
    get cost_center_path(@centro_ajeno)
    assert_response :success
    assert_equal false, estados["is_center_owner"],
                 "is_center_owner debe ser false en un centro cuyo user_owner es otro"
  end

  test "show no altera las claves de estados preexistentes" do
    sign_in_as @admin
    get cost_center_path(@centro)
    assert_response :success

    CLAVES_PREEXISTENTES.each do |clave|
      assert_includes estados.keys, clave,
                      "El merge de las claves de presupuesto piso la clave preexistente #{clave.inspect}"
    end
  end

  test "show responde 200 aunque el ModuleControl Presupuesto no exista" do
    as_user(@admin) do
      ModuleControl.where(name: "Presupuesto de gastos").destroy_all
    end
    assert_equal 0, ModuleControl.where(name: "Presupuesto de gastos").count

    # Con un usuario NO admin, que es el unico que llega a consultar el permiso:
    # `is_admin?` cortocircuita antes y no ejercitaria este camino.
    sign_in_as users(:ingeniero)
    get cost_center_path(@centro)

    assert_response :success, "Un modulo de permisos ausente no puede tumbar el detalle del centro de costos"
    refute estados["budget_module"]
  end
end
