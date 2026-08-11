require "test_helper"

# Congela la configuracion de `storage` de los 4 uploaders.
#
# POR QUE EXISTE: los cuatro archivos declaraban la forma condicional y despues,
# dos lineas mas abajo, un `storage :file` incondicional que la pisaba. El efecto
# era que produccion escribia en el filesystem efimero del dyno y perdia todos
# los archivos en el siguiente restart. El test 5 es el que impide que la
# regresion vuelva a entrar sin que nadie lo note.
#
# La rama de produccion NO se puede probar en runtime: `Rails.env.production?` se
# evalua al cargar la clase y en test `cache_classes = true`. Por eso esa rama se
# cubre con tres tests estaticos sobre el codigo fuente. No inventar recargas de
# clase con `load`.
class UploadersStorageTest < ActiveSupport::TestCase
  UPLOADERS = {
    "app/uploaders/avatar_uploader.rb"      => "AvatarUploader",
    "app/uploaders/certificate_uploader.rb" => "CertificateUploader",
    "app/uploaders/information_uploader.rb" => "InformationUploader",
    "app/uploaders/order_uploader.rb"       => "OrderUploader"
  }.freeze

  def fuente(ruta)
    File.read(Rails.root.join(ruta))
  end

  def test_avatar_uploader_usa_file_fuera_de_produccion
    assert_equal CarrierWave::Storage::File, AvatarUploader.storage
  end

  def test_certificate_uploader_usa_file_fuera_de_produccion
    assert_equal CarrierWave::Storage::File, CertificateUploader.storage
  end

  def test_information_uploader_usa_file_fuera_de_produccion
    assert_equal CarrierWave::Storage::File, InformationUploader.storage
  end

  def test_order_uploader_usa_file_fuera_de_produccion
    assert_equal CarrierWave::Storage::File, OrderUploader.storage
  end

  def test_ningun_uploader_declara_storage_incondicional
    UPLOADERS.each_key do |ruta|
      refute_match(/^\s*storage\s+:(file|fog)\s*$/, fuente(ruta),
                   "#{ruta} volvio a fijar storage sin condicional")
    end
  end

  def test_los_cuatro_uploaders_declaran_storage_una_sola_vez
    UPLOADERS.each_key do |ruta|
      assert_equal 1, fuente(ruta).scan(/^\s*storage[\s(]/).count,
                   "#{ruta} declara storage mas de una vez (o ninguna)"
    end
  end

  def test_los_cuatro_uploaders_declaran_la_forma_condicional
    UPLOADERS.each_key do |ruta|
      assert_match(/storage\(Rails\.env\.production\? \? :fog : :file\)/, fuente(ruta),
                   "#{ruta} no declara la forma condicional canonica")
    end
  end

  def test_carrierwave_no_procesa_imagenes_en_test
    refute CarrierWave::Uploader::Base.enable_processing,
           "enable_processing sigue activo en test: cada avatar dispara MiniMagick 5 veces"
  end

  def test_carrierwave_escribe_en_tmp_en_test
    # OJO: `CarrierWave.root` (modulo) NO es la raiz efectiva. El railtie la fija
    # a Rails.public_path en "carrierwave.setup_paths" y nuestro initializer
    # sobrescribe `CarrierWave::Uploader::Base.root`, que es la que resuelve
    # store_dir y cache_dir. La aserción va sobre la raiz efectiva.
    raiz_efectiva = CarrierWave::Uploader::Base.root.to_s

    esperado = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }.to_s
    assert_equal esperado, raiz_efectiva

    if ENV["E2E_UPLOAD_ROOT"].nil?
      # Caso normal de la suite: sin la ENV, tmp/uploads_test y nada mas.
      # El paquete 12 exporta E2E_UPLOAD_ROOT=public solo en su corrida.
      assert_equal Rails.root.join("tmp", "uploads_test").to_s, raiz_efectiva
    end
  end
end
