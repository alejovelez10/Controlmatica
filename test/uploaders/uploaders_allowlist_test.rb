require "test_helper"

# Allowlists de extension, content-type y tamano de los 4 uploaders.
#
# POR QUE EXISTE: con `storage :fog` activo, cualquier archivo que el navegador
# deje pasar termina en el bucket. Hasta el paquete 03 el unico control era el
# `accept` del input HTML, que se salta con un curl.
#
# El caso critico es el ultimo: CarrierWave valida al ASIGNAR un archivo, no al
# leerlo. Si las allowlists invalidaran las filas historicas (que tienen
# extensiones que hoy nadie controla), cada edicion de una orden vieja fallaria
# en produccion. Ese test es el que dice que eso no pasa.
class UploadersAllowlistTest < ActiveSupport::TestCase
  # Firma: upload("comprobante.png", "image/png") -> Rack::Test::UploadedFile
  def upload(name, type)
    Rack::Test::UploadedFile.new(Rails.root.join("test/fixtures/files", name), type)
  end

  # Genera un PNG real (cabecera valida, para que marcel lo sniffee como imagen)
  # relleno hasta el tamano pedido. Se usa para probar size_range sin versionar
  # un archivo de 6 MB en el repo.
  def png_de(bytes)
    semilla = File.binread(Rails.root.join("test/fixtures/files/comprobante.png"))
    archivo = Tempfile.new(["grande", ".png"])
    archivo.binmode
    archivo.write(semilla)
    archivo.write("\0" * (bytes - semilla.bytesize))
    archivo.flush
    archivo.rewind
    @tempfiles << archivo
    Rack::Test::UploadedFile.new(archivo.path, "image/png", true)
  end

  setup do
    @tempfiles = []
  end

  teardown do
    @tempfiles.each do |f|
      f.close!
    rescue StandardError
      nil
    end
    FileUtils.rm_rf(Rails.root.join("tmp/uploads_test"))
  end

  def test_avatar_acepta_png
    uploader = AvatarUploader.new(User.new, :avatar)
    uploader.cache!(upload("comprobante.png", "image/png"))
    assert uploader.file.present?
  end

  def test_avatar_rechaza_extension_exe
    uploader = AvatarUploader.new(User.new, :avatar)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(upload("malicioso.exe", "application/octet-stream"))
    end
  end

  def test_avatar_rechaza_archivo_disfrazado_de_png
    # disfrazado.png es un .exe renombrado: la extension pasa el allowlist y el
    # que corta es content_type_allowlist, porque marcel sniffea el contenido.
    uploader = AvatarUploader.new(User.new, :avatar)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(upload("disfrazado.png", "image/png"))
    end
  end

  def test_avatar_rechaza_archivo_de_6_megas
    uploader = AvatarUploader.new(User.new, :avatar)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(png_de(6.megabytes))
    end
  end

  def test_avatar_acepta_archivo_de_1_mega
    uploader = AvatarUploader.new(User.new, :avatar)
    uploader.cache!(png_de(1.megabyte))
    assert uploader.file.present?
  end

  def test_order_uploader_acepta_pdf
    uploader = OrderUploader.new(SalesOrder.new, :order_file)
    uploader.cache!(upload("comprobante.pdf", "application/pdf"))
    assert uploader.file.present?
  end

  def test_order_uploader_acepta_png
    uploader = OrderUploader.new(SalesOrder.new, :order_file)
    uploader.cache!(upload("comprobante.png", "image/png"))
    assert uploader.file.present?
  end

  def test_order_uploader_rechaza_exe
    uploader = OrderUploader.new(SalesOrder.new, :order_file)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(upload("malicioso.exe", "application/octet-stream"))
    end
  end

  def test_order_uploader_rechaza_archivo_de_11_megas
    uploader = OrderUploader.new(SalesOrder.new, :order_file)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(png_de(11.megabytes))
    end
  end

  def test_certificate_uploader_rechaza_exe
    uploader = CertificateUploader.new(CustomerInvoice.new, :delivery_certificate_file)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(upload("malicioso.exe", "application/octet-stream"))
    end
  end

  def test_information_uploader_rechaza_exe
    uploader = InformationUploader.new(CustomerInvoice.new, :reception_report_file)
    assert_raises(CarrierWave::IntegrityError) do
      uploader.cache!(upload("malicioso.exe", "application/octet-stream"))
    end
  end

  def test_registro_legado_con_extension_prohibida_sigue_siendo_valido
    # CASO DE FALLO CRITICO: las filas historicas tienen extensiones que nadie
    # controlo nunca (.rar entre ellas). CarrierWave valida al asignar, no al
    # leer; si esto se rompiera, cada edicion de una orden vieja fallaria en
    # produccion el dia del despliegue.
    centro = cost_centers(:centro_con_viaticos)
    # SalesOrder#change_state_cost_center recalcula el estado del centro y eso
    # cascadea a CostCenter#change_state, que multiplica hour_cotizada por
    # eng_hours sin guarda de nil. Se rellenan por update_columns (sin callbacks)
    # porque el objeto de este test es el uploader, no la cadena de estados.
    centro.update_columns(quotation_value: 50_000_000.0,
                          invoiced_state: "PENDIENTE DE ORDEN DE COMPRA",
                          hour_cotizada: 100_000.0, eng_hours: 200.0,
                          has_many_quotes: false)

    orden = as_user(users(:admin)) do
      SalesOrder.create!(cost_center_id: centro.id, user_id: users(:admin).id,
                         order_number: "OC-LEGADO-001", order_value: 1000.0,
                         created_date: Date.new(2026, 1, 20), description: "Orden historica")
    end

    SalesOrder.where(id: orden.id).update_all(order_file: "viejo.rar")
    orden.reload

    assert_equal "viejo.rar", orden.read_attribute(:order_file)
    assert orden.valid?, "una fila legada con extension prohibida dejo de ser valida"
    assert as_user(users(:admin)) { orden.update(description: "x") },
           "una fila legada con extension prohibida dejo de poder editarse"
  end
end
