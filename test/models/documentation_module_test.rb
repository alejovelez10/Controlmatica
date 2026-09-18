# == Schema Information
#
# Table name: documentation_modules
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  user_id     :integer
#
# Indexes
#
#  index_documentation_modules_on_lower_name  (lower((name)::text)) UNIQUE
#
require "test_helper"

# Modelos del modulo de Documentacion: DocumentationModule, DocumentationFile y
# su uploader. Los gates de permiso estan en la prueba del controller.
class DocumentationModuleTest < ActiveSupport::TestCase
  # --- Modulo ----------------------------------------------------------------

  test "el nombre es obligatorio y el mensaje llega en español" do
    modulo = DocumentationModule.new(name: "   ")

    assert_not modulo.valid?
    assert_includes modulo.errors.full_messages, "El módulo necesita un nombre"
  end

  test "el nombre es unico sin distinguir mayusculas ni espacios de sobra" do
    crear_modulo_doc("Manuales de gastos")
    repetido = DocumentationModule.new(name: "  manuales DE gastos ")

    assert_not repetido.valid?
    assert_includes repetido.errors.full_messages, "Ya existe un módulo con ese nombre"
  end

  test "el indice de la base frena el nombre repetido aunque se salte la validacion" do
    crear_modulo_doc("Politicas")
    copia = DocumentationModule.new(name: "POLITICAS")

    assert_raises(ActiveRecord::RecordNotUnique) { copia.save!(validate: false) }
  end

  test "un modulo sin archivos es valido" do
    assert DocumentationModule.new(name: "Formatos").valid?
  end

  test "alfabetico ordena sin distinguir mayusculas" do
    crear_modulo_doc("beta")
    crear_modulo_doc("Alfa")
    crear_modulo_doc("Gamma")

    assert_equal %w[Alfa beta Gamma], DocumentationModule.alfabetico.pluck(:name)
  end

  # --- Archivos --------------------------------------------------------------

  test "guarda el nombre original, el tipo y el tamaño del archivo" do
    modulo = crear_modulo_doc("Manuales", "comprobante.pdf")
    doc = modulo.documentation_files.first
    original = Rails.root.join("test/fixtures/files/comprobante.pdf")

    assert_equal "comprobante.pdf", doc.name
    assert_equal "application/pdf", doc.content_type
    assert_equal File.size(original), doc.byte_size
    assert doc.previewable?
    assert File.exist?(doc.file.path)
  end

  test "conserva tildes y espacios del nombre original aunque el guardado lo sanee" do
    upload = archivo_generado("Guía de gastos.txt", "Paso 1: pedir la factura", "text/plain")
    modulo = crear_modulo_doc("Guias", upload)
    doc = modulo.documentation_files.first

    assert_equal "Guía de gastos.txt", doc.name
    assert_not doc.previewable?, "un .txt no se debe pintar dentro de la aplicacion"
  end

  test "acepta txt, csv y xlsx" do
    modulo = crear_modulo_doc("Formatos",
                              archivo_generado("notas.txt", "hola", "text/plain"),
                              archivo_generado("datos.csv", "a,b\n1,2\n", "text/csv"),
                              "gastos_v2_18col.xlsx")

    assert_equal %w[datos.csv gastos_v2_18col.xlsx notas.txt], modulo.documentation_files.map(&:name).sort
  end

  test "rechaza una extension no permitida con mensaje en español" do
    modulo = DocumentationModule.create!(name: "Varios")
    doc = modulo.documentation_files.build(file: upload_fixture("malicioso.exe"))

    assert_not doc.valid?
    assert_equal 1, doc.errors.full_messages.size, doc.errors.full_messages.inspect
    assert_match(/No se permiten archivos/, doc.errors.full_messages.first)
  end

  test "rechaza un ejecutable disfrazado de imagen" do
    modulo = DocumentationModule.create!(name: "Varios")
    doc = modulo.documentation_files.build(file: upload_fixture("disfrazado.png"))

    assert_not doc.valid?
    assert_match(/No se permiten archivos/, doc.errors.full_messages.join)
  end

  test "rechaza un archivo vacio" do
    modulo = DocumentationModule.create!(name: "Varios")
    doc = modulo.documentation_files.build(file: archivo_generado("vacio.txt", "", "text/plain"))

    assert_not doc.valid?
    assert_match(/vacío/, doc.errors.full_messages.join)
  end

  # El archivo se crea DISPERSO (`truncate`): ocupa 50 MB para CarrierWave pero
  # casi nada en disco, y la prueba no escribe medio centenar de megas.
  test "rechaza un archivo de mas de 50 MB" do
    tmp = Tempfile.new(["grande", ".txt"])
    tmp.truncate(50.megabytes + 1)
    upload = Rack::Test::UploadedFile.new(tmp.path, "text/plain", original_filename: "grande.txt")
    modulo = DocumentationModule.create!(name: "Varios")
    doc = modulo.documentation_files.build(file: upload)

    assert_not doc.valid?
    assert_match(/demasiado grande/, doc.errors.full_messages.join)
  ensure
    tmp&.close!
  end

  test "un archivo sin binario no es valido" do
    modulo = DocumentationModule.create!(name: "Varios")
    doc = modulo.documentation_files.build

    assert_not doc.valid?
    assert_includes doc.errors.full_messages, "Debe adjuntar un archivo"
  end

  test "borrar el modulo borra sus archivos y los binarios" do
    modulo = crear_modulo_doc("Temporal", "comprobante.pdf", "comprobante.png")
    rutas = modulo.documentation_files.map { |d| d.file.path }
    assert rutas.all? { |r| File.exist?(r) }

    assert_difference -> { DocumentationFile.count }, -2 do
      modulo.destroy!
    end
    rutas.each { |r| assert_not File.exist?(r), "quedo huerfano: #{r}" }
  end

  test "borrar un archivo suelto borra su binario y deja el resto" do
    modulo = crear_modulo_doc("Temporal", "comprobante.pdf", "comprobante.png")
    doc, otro = modulo.documentation_files.to_a
    ruta = doc.file.path

    doc.destroy!

    assert_not File.exist?(ruta)
    assert File.exist?(otro.file.path)
    assert_equal [otro.id], modulo.reload.documentation_files.pluck(:id)
  end
end
