require "test_helper"

# Contrato SERVIDOR -> NAVEGADOR del kill switch de la captura asistida.
#
# Los dos formularios de gasto (`packs/ReportExpenseIndex.js` y
# `components/ShowConstCenter/ExpensesTable.jsx`) deciden si pintan el boton
# "Extraer datos del comprobante" con `window.CM_RECEIPT_EXTRACTION_ENABLED ===
# true`. Ese global lo publica `layouts/user.html.erb` leyendo el ENV
# RECEIPT_EXTRACTION_ENABLED en el servidor.
#
# Sin esta prueba el cableado vuelve a ser codigo muerto sin que nadie se entere:
# la interfaz simplemente no aparece y el flag parece "no funcionar". Por eso se
# verifica sobre el HTML de verdad y no sobre el helper aislado.
class ReceiptExtractionFlagTest < ActionDispatch::IntegrationTest
  setup do
    @admin  = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    # Figaro ya siembra la clave desde config/application.yml, asi que hay que
    # guardar el valor previo y restaurarlo: dejarla tocada contamina cualquier
    # prueba posterior que consulte ReceiptExtractionService.enabled?.
    @env_previo = ENV.to_hash.slice("RECEIPT_EXTRACTION_ENABLED")
  end

  teardown do
    ENV.delete("RECEIPT_EXTRACTION_ENABLED")
    @env_previo.each { |clave, valor| ENV[clave] = valor }
  end

  # Extrae el valor crudo que el layout interpolo en el <script>. Se lee como
  # texto y no como JSON porque lo que importa es el literal de JavaScript: un
  # `undefined`, un `nil` o un `"false"` entrecomillado romperian la comparacion
  # `=== true` de los dos formularios.
  def global_publicado
    response.body[/window\.CM_RECEIPT_EXTRACTION_ENABLED\s*=\s*([^;]+);/, 1]&.strip
  end

  test "con el ENV en false el layout publica el global en false" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "false"
    sign_in_as @admin

    get report_expenses_path
    assert_response :success
    assert_equal "false", global_publicado,
                 "Con el kill switch apagado el boton de extraccion no debe poder pintarse"
  end

  test "con el ENV en true el layout publica el global en true" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    sign_in_as @admin

    get report_expenses_path
    assert_response :success
    assert_equal "true", global_publicado,
                 "Encender RECEIPT_EXTRACTION_ENABLED tiene que llegar hasta el navegador"
  end

  # El otro formulario de gasto vive en la pestana del centro de costos y monta
  # otro componente: si el global solo llegara al indice de Gastos, la mitad de
  # la funcionalidad seguiria apagada.
  test "el global tambien llega a la pestana de gastos del centro de costos" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    sign_in_as @admin

    get cost_center_path(@centro)
    assert_response :success
    assert_equal "true", global_publicado
  end

  # Sin variable de entorno manda el default del servicio, que esta APAGADO a
  # proposito: el seam `call_vision_model` todavia no existe.
  test "sin la variable de entorno el global sale en false" do
    ENV.delete("RECEIPT_EXTRACTION_ENABLED")
    sign_in_as @admin

    get report_expenses_path
    assert_response :success
    assert_equal "false", global_publicado,
                 "El default tiene que ser APAGADO: encender por omision solo produce errores"
  end

  # El valor se interpola crudo dentro de un <script>: cualquier cosa que no sea
  # un booleano literal de JavaScript rompe la pagina entera, no solo el boton.
  test "el helper devuelve booleanos, nunca nil ni cadenas" do
    ENV["RECEIPT_EXTRACTION_ENABLED"] = "cualquier cosa"
    assert_equal false, ApplicationController.helpers.receipt_extraction_enabled?

    ENV["RECEIPT_EXTRACTION_ENABLED"] = "true"
    assert_equal true, ApplicationController.helpers.receipt_extraction_enabled?
  end
end
