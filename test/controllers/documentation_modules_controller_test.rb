require "test_helper"

# Configuracion > Documentacion: gates, altas multipart, borrado y descarga.
#
# LA REGLA QUE SE PRUEBA: cualquiera con sesion LEE (pantalla, JSON, descarga);
# solo el rol Administrador ESCRIBE. El ingeniero de las fixtures tiene varios
# permisos de menu y aun asi tiene que recibir 403: la escritura no se reparte
# por permisos.
#
# ALCANCE HONESTO: Minitest no ejecuta React. Aqui se prueba que la vista monte
# el pack con las props correctas, no lo que se ve en pantalla.
class DocumentationModulesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @sin_permisos = users(:sin_permisos)
  end

  def react_props
    nodo = css_select("div[data-react-class='DocumentationIndex']").first
    assert_not_nil nodo, "No se encontro el div de montaje de DocumentationIndex"
    JSON.parse(nodo["data-react-props"])
  end

  def assert_forbidden
    assert_response :forbidden
    assert_equal "error", json_body["type"]
    assert_match(/administrador/, json_body["message"].join)
  end

  # --- Lectura: cualquiera con sesion ----------------------------------------

  test "sin sesion no entra" do
    get documentation_modules_path
    assert_redirected_to new_user_session_path
  end

  test "un usuario sin permisos ve la pantalla, sin botones de administracion" do
    sign_in_as @sin_permisos

    get documentation_modules_path

    assert_response :success
    assert_equal({ "manage" => false }, react_props["estados"])
    assert_equal 50.megabytes, react_props["limits"]["max_file_size"]
    assert_includes react_props["limits"]["extensions"], "docx"
    assert_select "h1", /Documentación/
  end

  test "el administrador ve la pantalla con manage encendido" do
    sign_in_as @admin

    get documentation_modules_path

    assert_response :success
    assert_equal({ "manage" => true }, react_props["estados"])
  end

  test "un usuario sin permisos recibe los modulos y sus archivos por JSON" do
    crear_modulo_doc("Politicas", "comprobante.pdf")
    crear_modulo_doc("Manuales", "comprobante.png", "gastos_v2_18col.xlsx")
    sign_in_as @sin_permisos

    get documentation_modules_path(format: :json)

    assert_response :success
    assert_equal 2, json_body["total"]
    assert_equal %w[Manuales Politicas], json_body["data"].map { |m| m["name"] }
    manuales = json_body["data"].first
    assert_equal %w[comprobante.png gastos_v2_18col.xlsx], manuales["files"].map { |f| f["name"] }
    png = manuales["files"].first
    assert png["previewable"]
    assert_equal "png", png["extension"]
    assert_equal "/documentation_files/#{png['id']}/download", png["download_url"]
    # La URL del almacenamiento NO se expone: con S3 privado nace caducando.
    assert_not_includes response.body, "/uploads/"
  end

  test "un usuario sin permisos descarga un documento como adjunto" do
    doc = crear_modulo_doc("Politicas", "comprobante.pdf").documentation_files.first
    sign_in_as @sin_permisos

    get download_documentation_file_path(doc)

    assert_response :success
    assert_equal "application/pdf", response.media_type
    assert_match(/\Aattachment/, response.headers["Content-Disposition"])
    assert_match(/comprobante\.pdf/, response.headers["Content-Disposition"])
    assert_equal File.binread(Rails.root.join("test/fixtures/files/comprobante.pdf")), response.body
  end

  test "la vista previa de un PDF se entrega inline" do
    doc = crear_modulo_doc("Politicas", "comprobante.pdf").documentation_files.first
    sign_in_as @ingeniero

    get download_documentation_file_path(doc, disposition: "inline")

    assert_response :success
    assert_match(/\Ainline/, response.headers["Content-Disposition"])
  end

  test "un tipo que no se puede previsualizar se descarga aunque pidan inline" do
    doc = crear_modulo_doc("Formatos", archivo_generado("notas.txt", "<script>alert(1)</script>", "text/plain"))
            .documentation_files.first
    sign_in_as @ingeniero

    get download_documentation_file_path(doc, disposition: "inline")

    assert_response :success
    assert_match(/\Aattachment/, response.headers["Content-Disposition"])
  end

  test "la descarga respeta el nombre original con tildes" do
    doc = crear_modulo_doc("Guias", archivo_generado("Guía rápida.txt", "hola", "text/plain"))
            .documentation_files.first
    sign_in_as @ingeniero

    get download_documentation_file_path(doc)

    assert_includes response.headers["Content-Disposition"], "filename*=UTF-8''Gu%C3%ADa%20r%C3%A1pida.txt"
  end

  test "con almacenamiento remoto redirige a una URL firmada en el momento" do
    doc = crear_modulo_doc("Politicas", "comprobante.pdf").documentation_files.first
    sign_in_as @sin_permisos

    DocumentationModulesController.class_eval do
      alias_method :remote_storage_real?, :remote_storage?
      define_method(:remote_storage?) { true }
    end
    DocumentationFileUploader.class_eval do
      alias_method :url_real, :url
      define_method(:url) do |options = {}|
        "https://controlmatica.s3.us-east-2.amazonaws.com/#{path}?#{options[:query].to_query}"
      end
    end

    get download_documentation_file_path(doc, disposition: "inline")

    assert_response :redirect
    destino = URI.parse(response.location)
    assert_equal "controlmatica.s3.us-east-2.amazonaws.com", destino.host
    query = Rack::Utils.parse_query(destino.query)
    assert_match(/\Ainline; filename="comprobante\.pdf"/, query["response-content-disposition"])
    assert_equal "application/pdf", query["response-content-type"]
  ensure
    DocumentationModulesController.class_eval do
      alias_method :remote_storage?, :remote_storage_real?
      remove_method :remote_storage_real?
    end
    DocumentationFileUploader.class_eval do
      alias_method :url, :url_real
      remove_method :url_real
    end
  end

  # --- Escritura: solo Administrador ------------------------------------------

  test "el administrador crea un modulo con varios archivos a la vez" do
    sign_in_as @admin

    assert_difference -> { DocumentationModule.count } => 1, -> { DocumentationFile.count } => 3 do
      post documentation_modules_path, params: {
        name: "Manuales de gastos",
        description: "Para todo el equipo",
        files: [upload_fixture("comprobante.pdf"), upload_fixture("comprobante.png"),
                upload_fixture("gastos_v2_18col.xlsx")]
      }
    end

    register = assert_json_success(mensaje: "¡El módulo fue creado con éxito!")
    assert_equal "Manuales de gastos", register["name"]
    assert_equal 3, register["files"].size

    modulo = DocumentationModule.find(register["id"])
    assert_equal @admin.id, modulo.user_id
    assert_equal "Para todo el equipo", modulo.description
    assert modulo.documentation_files.all? { |d| d.user_id == @admin.id && File.exist?(d.file.path) }
  end

  test "el administrador puede crear un modulo sin archivos" do
    sign_in_as @admin

    assert_difference -> { DocumentationModule.count }, 1 do
      post documentation_modules_path, params: { name: "Formatos" }
    end
    assert_equal [], assert_json_success["files"]
  end

  test "crear sin nombre devuelve el error y no guarda nada" do
    sign_in_as @admin

    assert_no_difference -> { DocumentationModule.count } do
      post documentation_modules_path, params: { name: "  ", files: [upload_fixture("comprobante.pdf")] }
    end
    assert_json_error(incluye: "El módulo necesita un nombre")
  end

  test "crear con un nombre repetido devuelve el error" do
    crear_modulo_doc("Manuales")
    sign_in_as @admin

    assert_no_difference -> { DocumentationModule.count } do
      post documentation_modules_path, params: { name: "MANUALES" }
    end
    assert_json_error(incluye: "Ya existe un módulo con ese nombre")
  end

  test "si un archivo no es permitido no se guarda nada y el error dice cual" do
    sign_in_as @admin

    assert_no_difference ["DocumentationModule.count", "DocumentationFile.count"] do
      post documentation_modules_path, params: {
        name: "Mezcla",
        files: [upload_fixture("comprobante.pdf"), upload_fixture("malicioso.exe")]
      }
    end

    mensajes = assert_json_error(incluye: "«malicioso.exe»")
    assert mensajes.none? { |m| m.include?("Documentation files") }, mensajes.inspect
  end

  test "un no administrador recibe 403 al crear" do
    [@ingeniero, @sin_permisos].each do |usuario|
      sign_in_as usuario
      assert_no_difference -> { DocumentationModule.count } do
        post documentation_modules_path, params: { name: "Intruso", files: [upload_fixture("comprobante.pdf")] }
      end
      assert_forbidden
    end
  end

  test "el administrador renombra un modulo y le agrega archivos" do
    modulo = crear_modulo_doc("Manuales", "comprobante.pdf")
    sign_in_as @admin

    assert_difference -> { modulo.documentation_files.count }, 2 do
      patch documentation_module_path(modulo), params: {
        name: "Manuales 2026",
        files: [upload_fixture("comprobante.png"), archivo_generado("notas.txt", "hola", "text/plain")]
      }
    end

    register = assert_json_success(mensaje: "¡El módulo fue actualizado con éxito!")
    assert_equal "Manuales 2026", modulo.reload.name
    assert_equal %w[comprobante.pdf comprobante.png notas.txt], register["files"].map { |f| f["name"] }
  end

  test "editar con un archivo no permitido no renombra ni agrega nada" do
    modulo = crear_modulo_doc("Manuales", "comprobante.pdf")
    sign_in_as @admin

    patch documentation_module_path(modulo), params: {
      name: "Otro nombre", files: [upload_fixture("comprobante.png"), upload_fixture("malicioso.exe")]
    }

    assert_json_error(incluye: "malicioso.exe")
    assert_equal "Manuales", modulo.reload.name
    assert_equal 1, modulo.documentation_files.count
  end

  test "un no administrador recibe 403 al editar" do
    modulo = crear_modulo_doc("Manuales", "comprobante.pdf")
    sign_in_as @ingeniero

    patch documentation_module_path(modulo), params: { name: "Hackeado", files: [upload_fixture("comprobante.png")] }

    assert_forbidden
    assert_equal "Manuales", modulo.reload.name
    assert_equal 1, modulo.documentation_files.count
  end

  test "el administrador elimina un modulo con sus archivos" do
    modulo = crear_modulo_doc("Temporal", "comprobante.pdf", "comprobante.png")
    rutas = modulo.documentation_files.map { |d| d.file.path }
    sign_in_as @admin

    assert_difference -> { DocumentationModule.count } => -1, -> { DocumentationFile.count } => -2 do
      delete documentation_module_path(modulo)
    end

    assert_response :success
    assert_equal "delete", json_body["type"]
    rutas.each { |r| assert_not File.exist?(r), "quedo huerfano: #{r}" }
  end

  test "un no administrador recibe 403 al eliminar un modulo" do
    modulo = crear_modulo_doc("Temporal", "comprobante.pdf")
    sign_in_as @sin_permisos

    assert_no_difference ["DocumentationModule.count", "DocumentationFile.count"] do
      delete documentation_module_path(modulo)
    end
    assert_forbidden
  end

  test "el administrador elimina un documento suelto" do
    modulo = crear_modulo_doc("Temporal", "comprobante.pdf", "comprobante.png")
    doc, otro = modulo.documentation_files.to_a
    ruta = doc.file.path
    sign_in_as @admin

    assert_difference -> { DocumentationFile.count }, -1 do
      delete documentation_file_path(doc)
    end

    assert_response :success
    assert_equal "delete", json_body["type"]
    assert_equal [otro.id], json_body["register"]["files"].map { |f| f["id"] }
    assert_not File.exist?(ruta)
    assert DocumentationModule.exists?(modulo.id)
  end

  test "un no administrador recibe 403 al eliminar un documento" do
    doc = crear_modulo_doc("Temporal", "comprobante.pdf").documentation_files.first
    sign_in_as @ingeniero

    assert_no_difference -> { DocumentationFile.count } do
      delete documentation_file_path(doc)
    end
    assert_forbidden
    assert File.exist?(doc.file.path)
  end
end
