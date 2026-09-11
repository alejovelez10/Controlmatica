require "test_helper"

# Superficie Ruby de la pantalla de Reglas de gastos (paquete 14, tarea 6): la
# accion `index`, su gate, la plantilla y el contrato de props que recibe el
# pack de React.
#
# ALCANCE HONESTO: Minitest no ejecuta React. Aqui NO se prueba el multi-select,
# ni el aviso de la lista vacia, ni el textarea del agente; se prueba que la
# vista monte el pack correcto y que las props lleguen con la forma que el pack
# asume. Lo que se ve en pantalla lo cubre la suite E2E.
#
# Los gates de los endpoints JSON (403 con cuerpo) son de la tarea 5 y estan en
# expense_rules_controller_test.rb; aqui solo estan los dos que deciden si esta
# vista llega a renderizarse, porque son OTRO gate: el del `index` redirige, no
# responde 403.
class ExpenseRulesViewTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = users(:admin)
    @sin_permisos = users(:sin_permisos)

    # Usuario con el modulo "Reglas de gastos" pero SIN Crear/Editar/Eliminar.
    # Se construye en caliente con un rol propio en vez de agregarlo a rols.yml,
    # que tiene dueno unico (paquete 01, §7.2).
    @rol_lectura = Rol.create!(name: "Reglas vista solo lectura", description: "Solo entra al modulo")
    @solo_lectura = users(:ingeniero_sin_permisos)
    @solo_lectura.update_columns(rol_id: @rol_lectura.id)
    grant_permission!(@rol_lectura, "Reglas de gastos", "Ingreso al modulo")
  end

  # Extrae y parsea las props que webpacker-react serializa en el div de montaje.
  def react_props
    nodo = css_select("div[data-react-class]").first
    assert_not_nil nodo, "No se encontro el div de montaje de React en la respuesta"
    JSON.parse(nodo["data-react-props"])
  end

  # --- Acceso ----------------------------------------------------------------

  test "sin sesion redirige a login" do
    get expense_rules_path

    assert_redirected_to new_user_session_path
  end

  test "usuario con el permiso del modulo ve la pantalla" do
    sign_in @solo_lectura

    get expense_rules_path

    assert_response :success
    assert_select "div[data-react-class=?]", "ExpenseRuleIndex"
  end

  test "usuario sin el permiso no entra y vuelve al inicio" do
    sign_in @sin_permisos

    get expense_rules_path

    # Redirect y NO 403 con cuerpo JSON: quien pide esta ruta es un navegador
    # esperando HTML, y un JSON en pantalla es peor que volver al inicio.
    assert_redirected_to root_path
    assert_equal "No tiene permiso para ingresar al módulo de Reglas de gastos", flash[:alert]
  end

  test "admin entra aunque el rol no tenga el permiso explicito" do
    # El rol "Administrador" no tiene accion_modules asignados a proposito
    # (fixture del paquete 01): entra por `is_admin?`, no por permisos.
    sign_in @admin

    get expense_rules_path

    assert_response :success
    assert_select "div[data-react-class=?]", "ExpenseRuleIndex"
  end

  test "la vista monta el pack correcto" do
    sign_in @admin

    get expense_rules_path

    assert_match "ExpenseRuleIndex", response.body
    # Regresion: copiar parameterizations/index.html.erb y olvidar cambiar el
    # nombre del pack deja la pantalla montando otro modulo, que renderiza sin
    # error de servidor y con los datos equivocados.
    assert_no_match(/data-react-class="Parameterizations"/, response.body)
  end

  # --- Contrato de props -----------------------------------------------------

  test "las props traen estados con las tres claves" do
    sign_in @admin

    get expense_rules_path

    props = react_props
    # Con `estados` en null, `this.props.estados.create` lanza TypeError en el
    # navegador y la pagina queda EN BLANCO: sin error de servidor, sin log y
    # con un warning cripitco en la consola del cliente.
    assert_not_nil props["estados"], "Falta la prop estados"
    %w[create edit delete].each do |clave|
      assert props["estados"].key?(clave), "Falta estados.#{clave} en las props"
    end
  end

  test "el admin recibe los tres estados en true" do
    sign_in @admin

    get expense_rules_path

    assert_equal [true, true, true],
                 react_props["estados"].values_at("create", "edit", "delete"),
                 "El administrador debe poder crear, editar y eliminar reglas"
  end

  test "el usuario de solo lectura recibe los tres estados en false" do
    sign_in @solo_lectura

    get expense_rules_path

    assert_equal [false, false, false],
                 react_props["estados"].values_at("create", "edit", "delete"),
                 "Con solo 'Ingreso al modulo' no se puede crear, editar ni eliminar"
  end

  test "estados refleja cada accion por separado" do
    # Un solo permiso: si el controller mirara el modulo en bloque en vez de la
    # accion, las tres claves saldrian iguales y este test lo detecta.
    grant_permission!(@rol_lectura, "Reglas de gastos", "Editar")
    sign_in @solo_lectura

    get expense_rules_path

    props = react_props
    assert_equal false, props["estados"]["create"]
    assert_equal true,  props["estados"]["edit"]
    assert_equal false, props["estados"]["delete"]
  end

  test "las props traen el catalogo de roles para el multi-select" do
    sign_in @admin

    get expense_rules_path

    props = react_props
    assert_kind_of Array, props["roles"]
    assert props["roles"].any?, "El catalogo de roles llego vacio"
  end

  test "el catalogo de roles trae label y value" do
    sign_in @admin

    get expense_rules_path

    # Es la forma que exige react-select. Con User.all serializado entero, el
    # multi-select quedaria mudo sin lanzar ningun error.
    assert_equal %w[label value], react_props["roles"].first.keys.sort
  end

  test "las props traen el usuario actual" do
    sign_in @admin

    get expense_rules_path

    assert_not_nil react_props["current_user"], "Falta la prop current_user"
  end

  # --- Encabezado ------------------------------------------------------------

  test "el encabezado de la pantalla no dice Proyectos" do
    sign_in @admin

    get expense_rules_path

    assert_response :success
    # Sin el branch de `controller_name_helper` la cadena cae al `else` final y
    # el encabezado dice literalmente "Proyectos".
    assert_match "Reglas de gastos", response.body
  end

  # --- El endpoint JSON del mismo `index` ------------------------------------

  test "el index en JSON devuelve los mismos estados" do
    sign_in @admin

    get expense_rules_path(format: :json)

    assert_response :success
    cuerpo = JSON.parse(response.body)
    assert_equal({ "create" => true, "edit" => true, "delete" => true }, cuerpo["estados"])
  end

  test "el index en JSON tambien respeta el gate" do
    sign_in @sin_permisos

    get expense_rules_path(format: :json)

    # Aqui SI corresponde el 403 con cuerpo: quien pide JSON es codigo, no un
    # navegador, y un redirect a la raiz le llegaria como HTML de inicio.
    assert_response :forbidden
    assert_equal "error", JSON.parse(response.body)["type"]
  end

  # --- validate_candidate ----------------------------------------------------
  #
  # Es lo que el formulario llama al adjuntar el comprobante. Lo que se prueba no
  # es el motor de reglas (eso lo cubre expense_rule_service_test) sino que la
  # accion DELEGUE en el: si evaluara por su cuenta, la pantalla podria decir
  # "todo bien" y el Guardar rechazar.

  test "validate_candidate devuelve las violaciones del gasto en curso" do
    ExpenseRule.update_all(active: false)
    regla = ExpenseRule.create!(name: "Tope bajo", max_invoice_value: 10_000,
                                check_duplicates: false, active: true, is_default: true)
    sign_in_as @admin

    post "/validate_expense_rules", as: :json, params: {
      user_invoice_id: @admin.id, invoice_value: 500_000, invoice_total: 500_000,
      invoice_date: Date.current.to_s
    }

    assert_response :success
    cuerpo = JSON.parse(response.body)
    assert_equal false, cuerpo["ok"]
    assert_includes cuerpo["violations"].map { |v| v["code"] }, "invoice_value_exceeded"
    assert_includes cuerpo["applied_rules"], regla.name
  end

  test "validate_candidate con un gasto que cumple devuelve ok y ninguna violacion" do
    ExpenseRule.update_all(active: false)
    ExpenseRule.create!(name: "Tope alto", max_invoice_value: 1_000_000,
                        check_duplicates: false, active: true, is_default: true)
    sign_in_as @admin

    post "/validate_expense_rules", as: :json, params: {
      user_invoice_id: @admin.id, invoice_value: 5_000, invoice_total: 5_000,
      invoice_date: Date.current.to_s
    }

    cuerpo = JSON.parse(response.body)
    assert_equal true, cuerpo["ok"]
    assert_empty cuerpo["violations"]
  end

  test "validate_candidate NO crea ningun gasto" do
    sign_in_as @admin

    assert_no_difference -> { ReportExpense.count } do
      post "/validate_expense_rules", as: :json, params: {
        user_invoice_id: @admin.id, invoice_value: 500_000, invoice_total: 500_000,
        invoice_date: Date.current.to_s
      }
    end
  end
end
