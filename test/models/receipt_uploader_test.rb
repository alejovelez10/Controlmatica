require "test_helper"

# ReceiptUploader — el comprobante adjunto del gasto (paquete 06, tarea A2).
#
# Los archivos de test/fixtures/files/ son del paquete 01 (00-ARQUITECTURA 7.12):
# aqui solo se consumen por su nombre canonico. El unico archivo que se fabrica
# es el de 10,5 MB, que por decision del propio paquete NO se commitea.
class ReceiptUploaderTest < ActiveSupport::TestCase
  setup do
    @actor = users(:admin)
  end

  # Todo save de ReportExpense pasa por los callbacks de auditoria, que leen el
  # actor: sin `as_user` revientan o pierden el registro.
  def crear_gasto(**overrides)
    as_user(@actor) do
      ReportExpense.create!({
        user: @actor,
        cost_center: cost_centers(:centro_con_viaticos),
        user_invoice: users(:ingeniero),
        invoice_name: "Hotel Comprobante",
        invoice_date: Date.new(2026, 6, 1),
        description: "Alojamiento",
        invoice_number: "FE-C#{SecureRandom.hex(3)}",
        identification: "900111222",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      }.merge(overrides))
    end
  end

  # Archivo temporal con el tamaño exacto que pide el caso. Se borra al terminar
  # el proceso; no queda basura en el repo.
  def archivo_temporal(nombre, bytes)
    base = File.basename(nombre, ".*")
    tmp = Tempfile.new([base, File.extname(nombre)])
    tmp.binmode
    tmp.write("0" * bytes) if bytes.positive?
    tmp.flush
    tmp.rewind
    yield tmp
  ensure
    tmp.close
    tmp.unlink
  end

  test "acepta un pdf" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("comprobante.pdf")

    assert as_user(@actor) { gasto.save }, gasto.errors.full_messages.join(" / ")
    assert_match(/comprobante\.pdf\z/, gasto.receipt_file.path)
  end

  test "acepta un jpg" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("comprobante.jpg")

    assert as_user(@actor) { gasto.save }, gasto.errors.full_messages.join(" / ")
    assert_match(/comprobante\.jpg\z/, gasto.receipt_file.path)
  end

  test "rechaza extension no permitida" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("malicioso.exe")

    refute as_user(@actor) { gasto.save }
    # CarrierWave interpola la extension con `inspect`, por eso va entre
    # comillas. El mensaje se afirma COMPLETO: es el que ve el usuario final y
    # tiene que estar en español.
    assert_equal ["No se permiten archivos \"exe\". Tipos permitidos: jpg, jpeg, png, pdf, webp, heic"],
                 gasto.errors[:receipt_file]
  end

  test "rechaza content type que no coincide con la extension" do
    # disfrazado.png es malicioso.exe renombrado: la extension pasa el primer
    # filtro y solo los bytes lo delatan. Es el caso que la extension sola no
    # atrapa y la razon de que las DOS allowlists existan.
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("disfrazado.png")

    refute as_user(@actor) { gasto.save }
    assert_includes gasto.errors[:receipt_file].join(" "), "No se permiten archivos de tipo"
  end

  test "rechaza archivo mayor a 20 MB" do
    gasto = crear_gasto

    archivo_temporal("grande.pdf", 20.5.megabytes.to_i) do |tmp|
      gasto.receipt_file = Rack::Test::UploadedFile.new(tmp.path, "application/pdf",
                                                        original_filename: "grande.pdf")
      refute as_user(@actor) { gasto.save }
      assert_includes gasto.errors[:receipt_file].join(" "), "demasiado grande"
    end
  end

  test "rechaza archivo vacio" do
    gasto = crear_gasto

    archivo_temporal("vacio.pdf", 0) do |tmp|
      gasto.receipt_file = Rack::Test::UploadedFile.new(tmp.path, "application/pdf",
                                                        original_filename: "vacio.pdf")
      refute as_user(@actor) { gasto.save }
      assert_includes gasto.errors[:receipt_file].join(" "), "vacío"
    end
  end

  test "store_dir usa el id del gasto" do
    gasto = crear_gasto

    assert_equal "uploads/report_expense/receipt_file/#{gasto.id}",
                 ReceiptUploader.new(gasto, :receipt_file).store_dir
  end

  test "en entorno test el storage es file" do
    assert_equal CarrierWave::Storage::File, ReceiptUploader.storage
  end

  test "fog_public es false" do
    # Protege §6.5: si alguien lo vuelve publico, todas las facturas quedan en
    # una URL adivinable y PERMANENTE, sin gate de permiso ninguno.
    refute ReceiptUploader.fog_public
  end

  test "borra el archivo del disco al destruir el gasto" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("comprobante.pdf")
    as_user(@actor) { gasto.save! }
    ruta = gasto.receipt_file.path

    assert File.exist?(ruta)
    as_user(@actor) { gasto.destroy }
    refute File.exist?(ruta), "mount_uploader debe borrar el archivo al destruir el gasto"
  end

  test "reemplazar el comprobante borra el anterior" do
    gasto = crear_gasto
    gasto.receipt_file = upload_fixture("comprobante.pdf")
    as_user(@actor) { gasto.save! }
    ruta_vieja = gasto.receipt_file.path

    gasto.receipt_file = upload_fixture("comprobante.jpg")
    as_user(@actor) { gasto.save! }

    assert_match(/comprobante\.jpg\z/, gasto.reload.receipt_file.path)
    refute File.exist?(ruta_vieja), "el comprobante anterior debe desaparecer del almacenamiento"
  end
end
