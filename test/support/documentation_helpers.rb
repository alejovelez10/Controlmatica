# Helpers de las pruebas del modulo de Documentacion.
#
# Los archivos de test/fixtures/files/ tienen inventario cerrado (ver
# upload_helpers.rb), asi que los tipos que no estan ahi (txt, csv) se fabrican
# al vuelo con el nombre que haga falta, en vez de agregar fixtures nuevas.
module DocumentationHelpers
  # Firma: archivo_generado("notas.txt", "hola", "text/plain") -> Rack::Test::UploadedFile
  #
  # Va a un Tempfile y no a un StringIO: CarrierWave necesita una ruta en disco
  # para cachear el upload y revienta con un IO en memoria.
  def archivo_generado(nombre, contenido, tipo)
    tmp = Tempfile.new(["doc", File.extname(nombre)])
    tmp.binmode
    tmp.write(contenido)
    tmp.flush
    (@_tempfiles_doc ||= []) << tmp
    Rack::Test::UploadedFile.new(tmp.path, tipo, original_filename: nombre)
  end

  # Modulo guardado con los archivos dados (nombres de test/fixtures/files o
  # uploads ya armados). No necesita `as_user`: estos modelos no leen
  # User.current.
  #
  # Firma: crear_modulo_doc("Manuales", "comprobante.pdf", ...) -> DocumentationModule
  def crear_modulo_doc(nombre, *archivos)
    modulo = DocumentationModule.new(name: nombre, user_id: users(:admin).id)
    archivos.each do |a|
      upload = a.is_a?(String) ? upload_fixture(a) : a
      modulo.documentation_files.build(file: upload, user_id: users(:admin).id)
    end
    modulo.save!
    modulo
  end
end
