# Subida de archivos de test/fixtures/files/ con el content-type correcto.
#
# El inventario canonico de test/fixtures/files/ esta en 00-ARQUITECTURA.md 7.12
# y lo crea este paquete de una sola vez. Los paquetes 03, 05, 06, 10, 11 y 12
# solo declaran "ya existe"; nadie vuelve a crear archivos ahi con otros nombres.
module UploadHelpers
  # fixture_file_upload vive en ActionDispatch y NO esta disponible en
  # ActiveSupport::TestCase por defecto: sin este include, upload_fixture
  # revienta con NoMethodError en cualquier test de modelo o de uploader.
  include ActionDispatch::TestProcess::FixtureFile

  CONTENT_TYPES = {
    ".pdf"  => "application/pdf",
    ".jpg"  => "image/jpeg",
    ".jpeg" => "image/jpeg",
    ".png"  => "image/png",
    ".heic" => "image/heic",
    ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".exe"  => "application/octet-stream"
  }.freeze

  # Firma: upload_fixture("comprobante.pdf") -> Rack::Test::UploadedFile
  def upload_fixture(nombre)
    tipo = CONTENT_TYPES.fetch(File.extname(nombre)) do
      raise ArgumentError, "Extension sin content-type declarado: #{nombre}"
    end
    fixture_file_upload(Rails.root.join("test/fixtures/files", nombre), tipo)
  end
end
