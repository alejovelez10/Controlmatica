require "test_helper"

# Superficie Ruby de la pantalla de Gastos: el contrato de props que recibe el
# pack de React.
#
# ALCANCE HONESTO: Minitest no ejecuta React. Aqui NO se prueba la tabla ni los
# botones; se prueba que el servidor mande las banderas con las que el pack
# decide pintarlos. El comportamiento de cliente lo cubre la suite E2E.
#
# Mismo patron que accounting_expenses_view_test.rb, que es el archivo gemelo
# de la pantalla de Contabilidad.
class ReportExpensesViewTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    # Figaro siembra el entorno desde config/application.yml, asi que hay que
    # guardar el valor previo y restaurarlo: dejar la variable tocada contamina
    # cualquier prueba posterior que lea el flag.
    @env_previo = ENV.to_hash.slice("EXPENSE_IMPORT_VISIBLE")
  end

  teardown do
    ENV.delete("EXPENSE_IMPORT_VISIBLE")
    @env_previo.each { |clave, valor| ENV[clave] = valor }
  end

  # Extrae y parsea las props que webpacker-react serializa en el div de montaje.
  def react_props
    nodo = css_select("div[data-react-class]").first
    assert_not_nil nodo, "No se encontro el div de montaje de React en la respuesta"
    JSON.parse(nodo["data-react-props"])
  end

  # --- Boton de importar: escondido desde 2026-10-06 ------------------------

  test "el boton de importar NO se pinta por defecto, ni para el administrador" do
    sign_in @admin

    get report_expenses_path

    # `estados.import` es lo UNICO que pinta el boton en el pack
    # (ReportExpenseIndex.js:2464), asi que esta bandera es el escondite.
    assert_equal false, react_props["estados"]["import"]
  end

  test "con EXPENSE_IMPORT_VISIBLE encendido el administrador lo vuelve a ver" do
    # El flag esta en una variable de entorno justamente para esto: volver a
    # mostrar el boton es un `heroku config:set`, no un despliegue.
    ENV["EXPENSE_IMPORT_VISIBLE"] = "true"
    sign_in @admin

    get report_expenses_path

    assert_equal true, react_props["estados"]["import"]
  end

  test "el flag encendido NO le da el boton a quien no es administrador" do
    # El flag decide si el boton EXISTE; quien puede importar lo sigue
    # decidiendo `puede_importar?`. Si esta prueba falla, el flag se convirtio
    # en un permiso y le abrio el import a todo el mundo.
    ENV["EXPENSE_IMPORT_VISIBLE"] = "true"
    sign_in @ingeniero

    get report_expenses_path

    assert_equal false, react_props["estados"]["import"]
  end

  test "esconder el boton NO cierra el endpoint para el administrador" do
    # Es la mitad del pedido que se decidio NO hacer: el import es la via de la
    # carga historica y matarlo dejaria sin herramienta a quien tenga que subir
    # un archivo. Si esta prueba empieza a fallar, alguien ato el endpoint a la
    # visibilidad del boton.
    sign_in @admin

    get "/import_template/report_expenses"

    assert_response :success
  end

  test "el endpoint sigue cerrado para quien no es administrador" do
    sign_in @ingeniero

    get "/import_template/report_expenses"

    assert_response :forbidden
  end
end
