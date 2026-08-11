# Carga masiva de los telefonos de los usuarios, para el canal de WhatsApp.
#
# POR QUE EXISTE: `users.phone` se creo vacio (0 de 29 usuarios en desarrollo).
# El agente de WhatsApp resuelve quien reporta un gasto con
# `User.by_normalized_phone`, y en modo estricto —que es el default, y debe
# seguir siendolo— un numero que no esta en la base devuelve NINGUN actor y el
# gasto se RECHAZA. Es decir: mientras esta tabla este vacia, el canal de
# WhatsApp no sirve para nada. Meter 30 telefonos a mano por la pantalla de
# usuarios es lento y, sobre todo, no deja rastro de que se cargo ni detecta
# los duplicados.
#
# Uso:
#   bin/rails "users:import_phones[tmp/telefonos.csv]"          # local
#   heroku run -a <app> rake "users:import_phones[telefonos.csv]"
#   FORCE=1 bin/rails "users:import_phones[tmp/telefonos.csv]"  # pisa los distintos
#   bin/rails users:phones_report                               # solo diagnostico
#
# El CSV tiene DOS columnas con encabezado: `email` y `phone`. El telefono se
# acepta en cualquier formato de los que se ven en la practica
# (`+57 300 123 4567`, `3001234567`, `57 300 1234567`, `(300) 123-4567`): la
# normalizacion la hace `User.normalize_phone`, que se queda con los ultimos
# 10 digitos. NO se reimplementa aqui: si la llave del importador y la del
# agente divergieran, la carga "funcionaria" y el agente seguiria sin
# reconocer a nadie.
#
# TRES INVARIANTES QUE NO SE NEGOCIAN:
#
#   1. IDEMPOTENTE. Correrla dos veces deja exactamente el mismo estado y la
#      segunda corrida reporta 0 actualizados. Un importador que no lo sea
#      obliga a "acordarse" de si ya se corrio, y nadie se acuerda.
#   2. UN NUMERO REPETIDO ES PERSONA NO IDENTIFICADA. Si dos correos traen el
#      mismo telefono normalizado, NO se carga NINGUNO de los dos y se listan.
#      Es la misma regla que aplica el agente ante ambigüedad: nunca "el
#      primero". El indice de `phone_normalized` no es unico a proposito (para
#      que el backfill no reviente con dato sucio), asi que la unica defensa
#      es esta.
#   3. NO PISA UN TELEFONO DISTINTO SIN QUE ALGUIEN LO PIDA. Si el usuario ya
#      tiene un numero y el CSV trae otro, se lista y se salta; con FORCE=1 se
#      sobrescribe. Sobrescribir en silencio es como se pierde el telefono
#      bueno que alguien cargo a mano.
#
# `User.current` se setea en la primera linea: los callbacks de auditoria de
# `User#create_edit_register` hacen `User.current.id` SIN guarda de nil y
# revientan con NoMethodError fuera de un request web.
namespace :users do
  desc "Importa telefonos desde un CSV de dos columnas (email,phone). Idempotente. FORCE=1 sobrescribe los distintos"
  task :import_phones, [:archivo] => :environment do |_t, args|
    require "csv"

    # --- Actor de auditoria, ANTES de tocar un solo registro -----------------
    actor = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    abort "No hay ningun usuario con rol 'Administrador'. Los callbacks de auditoria de User hacen User.current.id sin guarda de nil: sin actor, el primer update revienta." if actor.nil?
    User.current = actor

    ruta = args[:archivo].to_s
    abort "Uso: rake \"users:import_phones[ruta/al/archivo.csv]\"" if ruta.blank?
    abort "No existe el archivo #{ruta}" unless File.exist?(ruta)

    forzar = ENV["FORCE"].to_s == "1"

    filas = CSV.read(ruta, headers: true).map do |fila|
      { email: fila["email"].to_s.strip.downcase, phone: fila["phone"].to_s.strip }
    end

    if filas.empty?
      puts "El archivo no tiene filas. Encabezado esperado: email,phone"
      next
    end

    resultado = UsersPhonesImport.new(filas, forzar: forzar).call

    puts "== users:import_phones =="
    puts "  archivo:      #{ruta}"
    puts "  filas leidas: #{filas.size}"
    puts "  FORCE:        #{forzar ? 'SI (sobrescribe los distintos)' : 'no'}"
    puts

    puts "  actualizados:      #{resultado[:actualizados].size}"
    puts "  ya estaban igual:  #{resultado[:sin_cambio].size}"
    puts "  correos sin usuario: #{resultado[:sin_usuario].size}"
    puts "  telefonos ilegibles: #{resultado[:ilegibles].size}"
    puts "  duplicados (NO cargados): #{resultado[:duplicados].size}"
    puts "  conflictos (NO cargados): #{resultado[:conflictos].size}" unless forzar
    puts

    imprimir = lambda do |titulo, lista|
      next if lista.empty?

      puts "  #{titulo}"
      lista.sort.each { |linea| puts "    - #{linea}" }
      puts
    end

    imprimir.call("Correos que no existen en la base (revise el CSV):", resultado[:sin_usuario])
    imprimir.call("Telefonos que no llegan al minimo de digitos:", resultado[:ilegibles])
    imprimir.call("Numeros repetidos ⇒ persona NO identificada. Resuelvalos y vuelva a correr:",
                  resultado[:duplicados])
    unless forzar
      imprimir.call("Ya tenian OTRO telefono. Revise cual es el bueno y use FORCE=1 si el del CSV manda:",
                    resultado[:conflictos])
    end

    puts "  Estado de la base tras la carga:"
    puts "    usuarios con telefono: #{User.where.not(phone_normalized: nil).count} de #{User.count}"
    repetidos_en_base = User.where.not(phone_normalized: nil)
                            .group(:phone_normalized)
                            .having("count(*) > 1")
                            .count
    puts "    llaves repetidas en la base: #{repetidos_en_base.size}"
    repetidos_en_base.each do |llave, veces|
      correos = User.by_normalized_phone(llave).order(:id).pluck(:email)
      puts "      #{llave} (#{veces}): #{correos.join(', ')}"
    end
  ensure
    User.current = nil
  end

  desc "Diagnostico de solo lectura: cuantos usuarios tienen telefono y que llaves estan repetidas"
  task phones_report: :environment do
    total = User.count
    con_telefono = User.where.not(phone_normalized: nil).count

    puts "== users:phones_report =="
    puts "  usuarios totales:      #{total}"
    puts "  con telefono cargado:  #{con_telefono}"
    puts "  sin telefono:          #{total - con_telefono}"
    puts

    repetidos = User.where.not(phone_normalized: nil)
                    .group(:phone_normalized)
                    .having("count(*) > 1")
                    .count

    if repetidos.empty?
      puts "  Sin llaves repetidas. El agente puede identificar a todos los que tienen numero."
    else
      puts "  🔴 LLAVES REPETIDAS: el agente NO identifica a ninguna de estas personas."
      repetidos.each do |llave, veces|
        correos = User.by_normalized_phone(llave).order(:id).pluck(:email)
        puts "    #{llave} (#{veces}): #{correos.join(', ')}"
      end
    end
    puts

    puts "  Inventario por rol (para la hoja de recoleccion):"
    User.left_joins(:rol)
        .group("rols.name")
        .order(Arel.sql("rols.name"))
        .pluck(Arel.sql("rols.name"),
               Arel.sql("count(*)"),
               Arel.sql("count(users.phone_normalized)"))
        .each do |rol, usuarios, con_numero|
      puts format("    %-28s %3d usuarios, %3d con telefono", rol || "(sin rol)", usuarios, con_numero)
    end
  end
end

# La logica de la importacion, separada de la impresion, para poder probarla.
#
# Vive dentro del .rake y no en app/services/ a proposito: es una herramienta de
# operacion, no una pieza del dominio, y meterla en `app/` la cargaria en cada
# request de produccion para siempre.
class UsersPhonesImport
  def initialize(filas, forzar: false)
    @filas = filas
    @forzar = forzar
  end

  # => { actualizados:, sin_cambio:, sin_usuario:, ilegibles:, duplicados:, conflictos: }
  #    Todos son arreglos de strings legibles, listos para imprimir.
  def call
    resultado = { actualizados: [], sin_cambio: [], sin_usuario: [],
                  ilegibles: [], duplicados: [], conflictos: [] }

    candidatos = []

    @filas.each do |fila|
      email = fila[:email]
      bruto = fila[:phone]

      if email.blank?
        resultado[:sin_usuario] << "(fila sin correo) #{bruto}"
        next
      end

      llave = User.normalize_phone(bruto)
      if llave.blank?
        resultado[:ilegibles] << "#{email}: \"#{bruto}\""
        next
      end

      usuario = User.where("lower(email) = ?", email).order(:id).first
      if usuario.nil?
        resultado[:sin_usuario] << email
        next
      end

      candidatos << { usuario: usuario, email: email, bruto: bruto, llave: llave }
    end

    # DETECCION DE DUPLICADOS ANTES DE ESCRIBIR NADA. Si se hiciera sobre la
    # marcha, el primero de un par repetido ya estaria guardado cuando aparece
    # el segundo y habria que deshacerlo.
    #
    # Se comparan tambien contra lo que YA hay en la base: un numero nuevo que
    # colisiona con el de otra persona ya cargada produce exactamente la misma
    # ambigüedad.
    por_llave = candidatos.group_by { |c| c[:llave] }

    aceptados = []
    por_llave.each do |llave, grupo|
      correos_csv = grupo.map { |c| c[:email] }.uniq
      ids_csv = grupo.map { |c| c[:usuario].id }

      colisiones_en_base = User.by_normalized_phone(llave)
                               .where.not(id: ids_csv)
                               .order(:id)
                               .pluck(:email)

      if correos_csv.size > 1 || colisiones_en_base.any?
        involucrados = (correos_csv + colisiones_en_base).uniq.sort
        resultado[:duplicados] << "#{llave}: #{involucrados.join(', ')}"
        next
      end

      aceptados.concat(grupo)
    end

    aceptados.each do |c|
      usuario = c[:usuario]
      actual = usuario.phone_normalized

      if actual == c[:llave]
        # IDEMPOTENCIA: misma llave => no se escribe. Aunque el formato crudo
        # difiera ("+57 300..." vs "3001234567"), la llave es lo unico que el
        # agente consulta, y reescribir por un guion de mas generaria un
        # RegisterEdit de auditoria falso en cada corrida.
        resultado[:sin_cambio] << c[:email]
        next
      end

      if actual.present? && !@forzar
        resultado[:conflictos] << "#{c[:email]}: en la base #{actual}, en el CSV #{c[:llave]}"
        next
      end

      usuario.update!(phone: c[:bruto])
      resultado[:actualizados] << "#{c[:email]} -> #{usuario.reload.phone_normalized}"
    end

    resultado
  end
end
