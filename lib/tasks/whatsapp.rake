# Tareas del canal de WhatsApp propio (paquete 17).
#
# El registro del numero en Meta va en cuatro pasos y cada uno es una tarea,
# porque entre el segundo y el tercero una persona tiene que leer el SMS:
#
#   bin/rails whatsapp:estado                  # solo lectura: verificado, nombre, estado
#   bin/rails "whatsapp:solicitar_codigo[SMS]" # o [VOICE]; llega al celular del numero
#   bin/rails "whatsapp:verificar_codigo[123456]"
#   bin/rails whatsapp:registrar               # usa WHATSAPP_PIN (6 digitos)
#   bin/rails whatsapp:suscribir               # suscribe la app a los webhooks de la cuenta
#
# Meta permite 10 intentos de registro cada 72 h: no repetir a ciegas.
# Ninguna tarea imprime el token.
namespace :whatsapp do
  def cliente_whatsapp
    abort "Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID" if ENV["WHATSAPP_TOKEN"].blank? || ENV["WHATSAPP_PHONE_NUMBER_ID"].blank?

    Whatsapp::Client.new
  end

  def correr_en_meta
    resultado = yield
    resultado.is_a?(Hash) ? resultado.each { |clave, valor| puts "#{clave}: #{valor}" } : puts(resultado.inspect)
  rescue Whatsapp::Client::Error => e
    abort "Meta respondio con error (codigo #{e.codigo.inspect}, HTTP #{e.http_status.inspect}): #{e.message}"
  end

  desc "Estado del numero en Meta (solo lectura)"
  task estado: :environment do
    correr_en_meta { cliente_whatsapp.estado_numero }
  end

  desc "Pide el codigo de verificacion del numero (SMS o VOICE)"
  task :solicitar_codigo, [:metodo] => :environment do |_t, args|
    correr_en_meta { cliente_whatsapp.solicitar_codigo(metodo: (args[:metodo].presence || "SMS").upcase) }
  end

  desc "Verifica el numero con el codigo que llego"
  task :verificar_codigo, [:codigo] => :environment do |_t, args|
    abort "Uso: bin/rails \"whatsapp:verificar_codigo[123456]\"" if args[:codigo].blank?

    correr_en_meta { cliente_whatsapp.verificar_codigo(args[:codigo]) }
  end

  desc "Registra el numero en la Cloud API con el PIN de WHATSAPP_PIN"
  task registrar: :environment do
    pin = ENV["WHATSAPP_PIN"].to_s
    abort "WHATSAPP_PIN tiene que ser de 6 digitos" unless pin.match?(/\A\d{6}\z/)

    correr_en_meta { cliente_whatsapp.registrar(pin) }
  end

  desc "Suscribe la app a los webhooks de la cuenta de WhatsApp (WHATSAPP_WABA_ID)"
  task suscribir: :environment do
    abort "Falta WHATSAPP_WABA_ID" if ENV["WHATSAPP_WABA_ID"].blank?

    correr_en_meta { cliente_whatsapp.suscribir_app(ENV["WHATSAPP_WABA_ID"]) }
  end

  # USD por millon de tokens: entrada, salida y lectura de cache (tabla de
  # precios de Anthropic, octubre de 2026). Es una ESTIMACION: no distingue la
  # escritura de cache, que cuesta 1,25 veces la entrada.
  PRECIOS_POR_MILLON = {
    "claude-opus-5-5" => [4.0, 20.0, 0.20], "claude-opus-5" => [5.0, 25.0, 0.50],
    "claude-sonnet-5-5" => [2.0, 10.0, 0.20], "claude-haiku-5-5" => [0.10, 0.50, 0.01]
  }.freeze

  desc "Uso y costo estimado del agente en los ultimos N dias (30 por defecto)"
  task :costos, [:dias] => :environment do |_t, args|
    dias = (args[:dias].presence || 30).to_i
    conversaciones = WhatsappConversation.where("created_at > ?", dias.days.ago)
    entrada = conversaciones.sum(:input_tokens)
    salida = conversaciones.sum(:output_tokens)
    cache = conversaciones.sum(:cache_read_tokens)
    modelo = Agente.modelo
    precio_entrada, precio_salida, precio_cache = PRECIOS_POR_MILLON.fetch(modelo, PRECIOS_POR_MILLON["claude-opus-5-5"])
    costo = (entrada * precio_entrada + salida * precio_salida + cache * precio_cache) / 1_000_000.0
    registros = conversaciones.where(closed_reason: "registro").count

    puts "Ultimos #{dias} dias (modelo #{modelo})"
    puts "Conversaciones: #{conversaciones.count}  ·  con registro guardado: #{registros}"
    puts "Tokens: entrada #{entrada}  ·  salida #{salida}  ·  leidos de cache #{cache}"
    puts format("Costo estimado: USD %.2f%s", costo,
                registros.positive? ? format("  ·  USD %.3f por registro", costo / registros) : "")
  end
end
