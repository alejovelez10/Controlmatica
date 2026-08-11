# Verificacion de la configuracion de almacenamiento de archivos.
#
# Por que existe: hasta el paquete 03 los 4 uploaders terminaban en
# `storage :file` y todo se escribia en el filesystem efimero del dyno. El fallo
# no se veia al subir (la subida "funcionaba"), sino un dia despues, cuando
# Heroku reciclaba el dyno y el archivo ya no estaba. Esta tarea hace visible en
# 5 segundos lo que antes se descubria en produccion.
#
# Uso:
#   bin/rails storage:check                       # local, sin credenciales: informa y sale 1
#   heroku run rake storage:check -a <app>        # produccion: ademas hace el round trip real
#
# NUNCA imprime el valor de una credencial, solo su longitud.
namespace :storage do
  desc "Verifica ENV de AWS, storage de los 4 uploaders y (solo en produccion) un round trip real contra S3"
  task check: :environment do
    fallas = []

    puts "== Variables de entorno =="
    %w[AWS_ACCESS_KEY AWS_SECRET_KEY AWS_BUCKET AWS_REGION].each do |nombre|
      valor = ENV[nombre]
      if valor.present?
        puts format("  %-16s PRESENTE (%d chars)", nombre, valor.length)
      else
        puts format("  %-16s AUSENTE", nombre)
        fallas << "#{nombre} ausente"
      end
    end

    puts
    puts "== Storage de los uploaders =="
    [AvatarUploader, CertificateUploader, InformationUploader, OrderUploader].each do |klass|
      puts format("  %-22s %s", klass.name, klass.storage)
    end

    if Rails.env.production?
      [AvatarUploader, CertificateUploader, InformationUploader, OrderUploader].each do |klass|
        next if klass.storage == CarrierWave::Storage::Fog

        fallas << "#{klass.name} no usa Fog en produccion"
      end
    end

    if Rails.env.production?
      puts
      puts "== Round trip contra S3 =="
      if ENV["AWS_ACCESS_KEY"].blank? || ENV["AWS_SECRET_KEY"].blank? || ENV["AWS_BUCKET"].blank?
        puts "  OMITIDO: faltan credenciales"
        fallas << "round trip omitido por credenciales ausentes"
      else
        begin
          conexion = Fog::Storage.new(
            provider: "AWS",
            aws_access_key_id: ENV["AWS_ACCESS_KEY"],
            aws_secret_access_key: ENV["AWS_SECRET_KEY"],
            region: ENV.fetch("AWS_REGION", "us-east-1")
          )
          bucket = conexion.directories.get(ENV["AWS_BUCKET"])
          raise "El bucket #{ENV["AWS_BUCKET"]} no es visible con estas credenciales" if bucket.nil?

          puts "  location del bucket: #{bucket.location}"

          clave = "storage_check/#{Time.now.utc.strftime("%Y%m%d%H%M%S")}.txt"
          bucket.files.create(key: clave, body: "ok")
          leido = bucket.files.get(clave)
          raise "El objeto recien subido no se pudo releer" if leido.nil?
          raise "El contenido releido no coincide: #{leido.body.inspect}" if leido.body != "ok"

          leido.destroy
          puts "  ROUND TRIP OK (#{clave})"
        rescue => e
          puts "  FALLO: #{e.class}: #{e.message}"
          fallas << "round trip: #{e.class}"
        end
      end
    else
      puts
      puts "== Round trip contra S3 =="
      puts "  OMITIDO: solo se ejecuta en produccion (Rails.env = #{Rails.env})"
    end

    puts
    if fallas.empty?
      puts "RESULTADO: OK"
    else
      puts "RESULTADO: #{fallas.size} FALLA(S)"
      fallas.each { |f| puts "  - #{f}" }
      # exit 1 para poder encadenarla en un release script.
      exit 1
    end
  end
end
