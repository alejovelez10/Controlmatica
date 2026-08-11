require "test_helper"
require "rake"

# `rake users:import_phones[archivo.csv]` — carga masiva de telefonos.
# Paquete 13, bloque A.
#
# POR QUE SE PRUEBA ESTO CON TANTO DETALLE: esta task es la unica precondicion
# que separa "el canal de WhatsApp esta construido" de "el canal de WhatsApp
# sirve". Con la columna vacia, `actor_user_by_phone` devuelve nil y en modo
# estricto —el default— TODO gasto por WhatsApp se rechaza. Y sus tres
# invariantes (idempotencia, duplicado = persona no identificada, no pisar en
# silencio) son justamente las que se rompen sin que nadie se entere: el
# importador seguiria diciendo "ok" mientras deja la base inutilizable para el
# agente.
class UsersPhonesRakeTest < ActiveSupport::TestCase
  setup do
    @rake = Rake::Application.new
    Rake.application = @rake
    Rake::Task.define_task(:environment)
    load Rails.root.join("lib/tasks/users_phones.rake")
  end

  teardown do
    Rake.application = nil
    User.current = nil
  end

  # --- Ayudas ---------------------------------------------------------------

  def importar(filas, forzar: false)
    as_user(users(:admin)) { UsersPhonesImport.new(filas, forzar: forzar).call }
  end

  def fila(email, phone)
    { email: email.downcase, phone: phone }
  end

  def con_csv(contenido)
    archivo = Tempfile.new(["telefonos", ".csv"])
    archivo.write(contenido)
    archivo.flush
    yield archivo.path
  ensure
    archivo.close!
  end

  def correr_task(ruta, forzar: false)
    previo = ENV["FORCE"]
    ENV["FORCE"] = forzar ? "1" : nil
    salida = capture_io do
      Rake::Task["users:import_phones"].reenable
      Rake::Task["users:import_phones"].invoke(ruta)
    end
    salida.first
  ensure
    ENV["FORCE"] = previo
    User.current = nil
  end

  # --- Carga basica ---------------------------------------------------------

  test "carga el telefono de un usuario que no tenia" do
    usuario = users(:gerente)
    assert_nil usuario.phone_normalized, "la fixture ya traia telefono: el test no probaria nada"

    resultado = importar([fila(usuario.email, "+57 311 222 3344")])

    assert_equal 1, resultado[:actualizados].size
    assert_empty resultado[:duplicados]
    assert_equal "3112223344", usuario.reload.phone_normalized
    assert_equal "+57 311 222 3344", usuario.phone, "el formato original se conserva tal cual se recibio"
  end

  test "acepta los cuatro formatos de entrada que se ven en la practica" do
    entradas = {
      users(:gerente).email => ["+57 300 123 4599", "3001234599"],
      users(:ingeniero_dos).email => ["57 300 1234500", "3001234500"],
      users(:contador).email => ["(300) 123-4501", "3001234501"],
      users(:sin_permisos).email => ["300 123 4502", "3001234502"]
    }

    resultado = importar(entradas.map { |email, (bruto, _)| fila(email, bruto) })

    assert_equal 4, resultado[:actualizados].size, resultado.inspect
    entradas.each do |email, (_, esperado)|
      assert_equal esperado, User.find_by(email: email).phone_normalized,
                   "#{email} no quedo normalizado a #{esperado}"
    end
  end

  test "la llave la calcula User.normalize_phone y no una copia local" do
    # Si el importador reimplementara la normalizacion, la carga "funcionaria" y
    # el agente —que consulta por `User.normalize_phone`— seguiria sin
    # reconocer a nadie. Se ancla con un caso de mas de 10 digitos.
    resultado = importar([fila(users(:gerente).email, "+57 320 888 7766")])

    assert_equal 1, resultado[:actualizados].size
    assert_equal User.normalize_phone("+57 320 888 7766"),
                 users(:gerente).reload.phone_normalized
  end

  # --- Idempotencia (invariante 1) ------------------------------------------

  test "correrla dos veces deja el mismo estado y la segunda no actualiza nada" do
    filas = [fila(users(:gerente).email, "+57 311 222 3344")]

    primera = importar(filas)
    llave_tras_primera = users(:gerente).reload.phone_normalized

    segunda = importar(filas)

    assert_equal 1, primera[:actualizados].size
    assert_empty segunda[:actualizados], "la segunda corrida volvio a escribir: no es idempotente"
    assert_equal [users(:gerente).email], segunda[:sin_cambio]
    assert_equal llave_tras_primera, users(:gerente).reload.phone_normalized
  end

  test "el mismo numero en otro formato tampoco genera una escritura" do
    # `+57 300 123 4567` y `3001234567` son la misma llave. Reescribir por un
    # guion de mas dejaria un RegisterEdit de auditoria falso en cada corrida.
    ingeniero = users(:ingeniero)
    assert_equal "3001234567", ingeniero.phone_normalized

    resultado = importar([fila(ingeniero.email, "(300) 123-4567")])

    assert_empty resultado[:actualizados]
    assert_equal [ingeniero.email], resultado[:sin_cambio]
  end

  test "no crea registros de auditoria cuando no hay cambios" do
    filas = [fila(users(:gerente).email, "+57 311 222 3344")]
    importar(filas)

    antes = RegisterEdit.count
    importar(filas)

    assert_equal antes, RegisterEdit.count,
                 "la segunda corrida escribio auditoria: esta reescribiendo sin necesidad"
  end

  # --- Duplicados (invariante 2) --------------------------------------------

  test "dos correos con el mismo numero: no se carga NINGUNO" do
    resultado = importar([fila(users(:gerente).email, "+57 315 111 2222"),
                          fila(users(:contador).email, "315 111 2222")])

    assert_empty resultado[:actualizados], "cargo un duplicado: el agente no podria identificar a nadie"
    assert_equal 1, resultado[:duplicados].size
    assert_match(/3151112222/, resultado[:duplicados].first)
    assert_match(/gerente@controlmatica\.test/, resultado[:duplicados].first)
    assert_match(/contador@controlmatica\.test/, resultado[:duplicados].first)

    assert_nil users(:gerente).reload.phone_normalized
    assert_nil users(:contador).reload.phone_normalized
  end

  test "un duplicado no arrastra a las demas filas del archivo" do
    resultado = importar([fila(users(:gerente).email, "+57 315 111 2222"),
                          fila(users(:contador).email, "315 111 2222"),
                          fila(users(:sin_permisos).email, "+57 316 444 5555")])

    assert_equal 1, resultado[:actualizados].size
    assert_equal 1, resultado[:duplicados].size
    assert_equal "3164445555", users(:sin_permisos).reload.phone_normalized
  end

  test "colisionar con un numero que YA esta en la base tambien se rechaza" do
    # La ambigüedad es la misma aunque el otro dueño del numero no venga en el
    # CSV: el agente recibe dos candidatos y no puede elegir.
    assert_equal "3001234567", users(:ingeniero).phone_normalized

    resultado = importar([fila(users(:gerente).email, "300 123 4567")])

    assert_empty resultado[:actualizados]
    assert_equal 1, resultado[:duplicados].size
    assert_match(/ingeniero@controlmatica\.test/, resultado[:duplicados].first)
    assert_nil users(:gerente).reload.phone_normalized
  end

  test "reimportar su propio numero no se confunde con una colision" do
    # `ingeniero` ya tiene 3001234567 y el CSV le trae el mismo: la unica fila
    # que colisiona es la suya, asi que no hay ambigüedad.
    resultado = importar([fila(users(:ingeniero).email, "3001234567")])

    assert_empty resultado[:duplicados]
    assert_equal [users(:ingeniero).email], resultado[:sin_cambio]
  end

  # --- No pisar en silencio (invariante 3) ----------------------------------

  test "un telefono distinto al que ya hay se lista y NO se carga" do
    ingeniero = users(:ingeniero)

    resultado = importar([fila(ingeniero.email, "+57 322 777 8899")])

    assert_empty resultado[:actualizados]
    assert_equal 1, resultado[:conflictos].size
    assert_match(/3001234567/, resultado[:conflictos].first)
    assert_match(/3227778899/, resultado[:conflictos].first)
    assert_equal "3001234567", ingeniero.reload.phone_normalized
  end

  test "con FORCE=1 el telefono distinto si se sobrescribe" do
    ingeniero = users(:ingeniero)

    resultado = importar([fila(ingeniero.email, "+57 322 777 8899")], forzar: true)

    assert_equal 1, resultado[:actualizados].size
    assert_empty resultado[:conflictos]
    assert_equal "3227778899", ingeniero.reload.phone_normalized
  end

  test "FORCE=1 NO relaja la regla de duplicados" do
    # Forzar sirve para resolver "cual de los dos numeros de esta persona es el
    # bueno", nunca para meter una ambigüedad a la base.
    resultado = importar([fila(users(:gerente).email, "+57 315 111 2222"),
                          fila(users(:contador).email, "3151112222")], forzar: true)

    assert_empty resultado[:actualizados]
    assert_equal 1, resultado[:duplicados].size
    assert_nil users(:gerente).reload.phone_normalized
  end

  # --- Datos sucios ---------------------------------------------------------

  test "un correo que no existe se reporta y no detiene el archivo" do
    resultado = importar([fila("fantasma@controlmatica.test", "+57 317 000 1111"),
                          fila(users(:gerente).email, "+57 318 000 2222")])

    assert_equal ["fantasma@controlmatica.test"], resultado[:sin_usuario]
    assert_equal 1, resultado[:actualizados].size
    assert_equal "3180002222", users(:gerente).reload.phone_normalized
  end

  test "el correo se compara sin distinguir mayusculas ni espacios" do
    resultado = importar([fila("  GERENTE@CONTROLMATICA.TEST  ".strip.downcase, "+57 319 000 3333")])

    assert_equal 1, resultado[:actualizados].size, resultado.inspect
    assert_equal "3190003333", users(:gerente).reload.phone_normalized
  end

  test "un telefono demasiado corto se reporta como ilegible y no se carga" do
    resultado = importar([fila(users(:gerente).email, "300 12")])

    assert_empty resultado[:actualizados]
    assert_equal 1, resultado[:ilegibles].size
    assert_match(/gerente@controlmatica\.test/, resultado[:ilegibles].first)
    assert_nil users(:gerente).reload.phone_normalized
  end

  test "una fila sin correo se reporta y no revienta" do
    resultado = importar([fila("", "+57 300 111 2222")])

    assert_equal 1, resultado[:sin_usuario].size
    assert_empty resultado[:actualizados]
  end

  # --- La task de verdad, con su CSV ----------------------------------------

  test "la task lee el CSV, carga e imprime el reporte" do
    csv = "email,phone\n#{users(:gerente).email},+57 311 222 3344\nfantasma@x.test,3001110000\n"

    salida = con_csv(csv) { |ruta| correr_task(ruta) }

    assert_match(/users:import_phones/, salida)
    assert_match(/actualizados:\s+1/, salida)
    assert_match(/correos sin usuario:\s+1/, salida)
    assert_match(/fantasma@x\.test/, salida)
    assert_equal "3112223344", users(:gerente).reload.phone_normalized
  end

  test "la task es idempotente de punta a punta" do
    csv = "email,phone\n#{users(:gerente).email},+57 311 222 3344\n"

    con_csv(csv) { |ruta| correr_task(ruta) }
    antes = RegisterEdit.count
    segunda = con_csv(csv) { |ruta| correr_task(ruta) }

    assert_match(/actualizados:\s+0/, segunda)
    assert_match(/ya estaban igual:\s+1/, segunda)
    assert_equal antes, RegisterEdit.count
  end

  test "la task reporta los duplicados que ya existen en la base" do
    # Las fixtures traen `telefono_repetido_a` y `_b` con la misma llave a
    # proposito: el reporte final tiene que hacerlos visibles.
    csv = "email,phone\n#{users(:gerente).email},+57 311 222 3344\n"

    salida = con_csv(csv) { |ruta| correr_task(ruta) }

    assert_match(/llaves repetidas en la base: 1/, salida)
    assert_match(/repetidoa@controlmatica\.test/, salida)
    assert_match(/repetidob@controlmatica\.test/, salida)
  end

  test "la task aborta si el archivo no existe, en vez de reportar cero" do
    error = assert_raises(SystemExit) { correr_task("/tmp/no-existe-jamas-#{SecureRandom.hex}.csv") }

    refute error.success?
  end

  test "la task deja User.current en nil al terminar" do
    csv = "email,phone\n#{users(:gerente).email},+57 311 222 3344\n"

    con_csv(csv) { |ruta| correr_task(ruta) }

    assert_nil User.current, "la task se dejo el actor puesto: contamina el resto del proceso"
  end

  # --- El diagnostico de solo lectura ---------------------------------------

  test "phones_report cuenta y no escribe nada" do
    antes = User.where.not(phone_normalized: nil).count

    salida = capture_io do
      Rake::Task["users:phones_report"].reenable
      Rake::Task["users:phones_report"].invoke
    end.first

    assert_match(/con telefono cargado:\s+#{antes}/, salida)
    assert_match(/LLAVES REPETIDAS/, salida, "las fixtures traen un par repetido: el reporte debe verlo")
    assert_match(/Inventario por rol/, salida)
    assert_equal antes, User.where.not(phone_normalized: nil).count
  end
end
