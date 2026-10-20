module Whatsapp
  # Quien escribe (paquete 17). Misma regla que el actor estricto del MCP
  # (ApplicationTool.actor_user_by_phone): DOS USUARIOS CON EL MISMO NUMERO
  # SIGNIFICAN NINGUNO, nunca "el primero". Atribuirle un gasto a la persona
  # equivocada es peor que no registrarlo.
  #
  # Orden: primero el BSUID guardado (es lo unico que llega cuando la persona
  # usa nombre de usuario de WhatsApp y no comparte el numero), despues el
  # telefono. Si se identifica por telefono y el mensaje trae BSUID, se guarda
  # en el usuario para reconocerla aunque mas adelante deje de llegar el
  # numero.
  module Identidad
    Resultado = Struct.new(:usuario, :motivo, keyword_init: true) do
      def encontrado? = usuario.present?
    end

    NO_REGISTRADO = (
      "No encuentro tu número en Controlmatica, así que no puedo registrar nada a tu nombre. " \
      "Pídele al administrador que registre este número en tu usuario y volvemos."
    ).freeze

    AMBIGUO = (
      "Tu número está registrado en más de un usuario de Controlmatica y no puedo saber cuál eres. " \
      "Avísale al administrador para que lo corrija."
    ).freeze

    module_function

    def resolver(wa_id:, bsuid:)
      por_bsuid = bsuid.present? ? User.where(whatsapp_user_id: bsuid).order(:id).limit(2).to_a : []
      return Resultado.new(usuario: por_bsuid.first) if por_bsuid.size == 1

      clave = User.normalize_phone(wa_id)
      return Resultado.new(motivo: :no_registrado) if clave.blank?

      coincidencias = User.by_normalized_phone(clave).order(:id).limit(2).to_a
      return Resultado.new(motivo: :ambiguo) if coincidencias.size > 1
      return Resultado.new(motivo: :no_registrado) if coincidencias.empty?

      usuario = coincidencias.first
      recordar_bsuid(usuario, bsuid)
      Resultado.new(usuario: usuario)
    end

    def mensaje_para(motivo)
      return AMBIGUO if motivo == :ambiguo

      [NO_REGISTRADO, pista_de_vinculo].compact.join("\n\n")
    end

    # Para quien SI tiene usuario pero escribe con un nombre de usuario de
    # WhatsApp (sin telefono) o con un numero distinto al registrado.
    def pista_de_vinculo
      return nil unless Vinculo.numero_publico

      opciones = Rails.application.config.action_mailer.default_url_options || {}
      url = Rails.application.routes.url_helpers.whatsapp_vincular_url(**opciones)
      "Si ya tienes usuario en Controlmatica, abre #{url} desde este celular con tu sesión iniciada y " \
        "envía el mensaje que se abre."
    end

    # update_column y no save: los callbacks de User escriben auditoria con
    # User.current, que en un job no existe (gotcha 1 de gotchas-controlmatica).
    def recordar_bsuid(usuario, bsuid)
      return if bsuid.blank? || usuario.whatsapp_user_id == bsuid

      usuario.update_column(:whatsapp_user_id, bsuid)
    end
  end
end
