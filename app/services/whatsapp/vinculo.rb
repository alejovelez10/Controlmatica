module Whatsapp
  # Vincula un WhatsApp con un usuario de Controlmatica sin pasar por el
  # administrador (paquete 17, fase 4).
  #
  # Para que existe: desde 2026 una persona puede usar un nombre de usuario de
  # WhatsApp y entonces su telefono NO llega en el webhook; solo llega el BSUID,
  # que el sistema no conoce. La persona abre /whatsapp/vincular con su sesion
  # iniciada, eso abre WhatsApp con el mensaje "vincular <token>" ya escrito, y
  # al enviarlo queda guardado su BSUID. El token esta firmado y vence a los 30
  # minutos: no hay nada que guardar en la base mientras tanto.
  module Vinculo
    PROPOSITO = :vincular_whatsapp
    VIGENCIA = 30.minutes
    PATRON = /\Avincular\s+(\S+)\s*\z/i.freeze

    module_function

    def numero_publico = ENV["WHATSAPP_NUMERO_PUBLICO"].to_s.gsub(/\D/, "").presence

    def token_para(usuario)
      verificador.generate(usuario.id, expires_in: VIGENCIA, purpose: PROPOSITO)
    end

    def enlace_para(usuario)
      return nil unless numero_publico

      "https://wa.me/#{numero_publico}?text=#{ERB::Util.url_encode("vincular #{token_para(usuario)}")}"
    end

    def pedido?(texto)
      PATRON.match?(texto.to_s.strip)
    end

    # => [usuario, mensaje para la persona]
    def vincular(mensaje)
      token = PATRON.match(mensaje.body.to_s.strip)&.[](1)
      usuario = token && User.find_by(id: verificador.verified(token, purpose: PROPOSITO))
      return [nil, "Ese enlace ya venció o no es válido. Ábrelo de nuevo desde Controlmatica."] unless usuario

      if mensaje.bsuid.present?
        User.where(whatsapp_user_id: mensaje.bsuid).where.not(id: usuario.id).update_all(whatsapp_user_id: nil)
        usuario.update_column(:whatsapp_user_id, mensaje.bsuid)
      end
      completar_telefono(usuario, mensaje.wa_id)
      [usuario, "Listo, #{usuario.names.to_s.strip.presence || usuario.email}: tu WhatsApp quedó vinculado " \
                "a Controlmatica. Ya puedes registrar gastos y reportes de servicio por aquí."]
    end

    # Si el usuario no tenia telefono y el numero no es de nadie mas, se guarda.
    # Nunca se pisa un telefono cargado por el administrador. update_columns y no
    # save: los callbacks de User escriben auditoria con User.current, que aqui
    # no existe.
    def completar_telefono(usuario, wa_id)
      clave = User.normalize_phone(wa_id)
      return if clave.blank? || usuario.phone.present?
      return if User.by_normalized_phone(clave).where.not(id: usuario.id).exists?

      usuario.update_columns(phone: "+#{wa_id}", phone_normalized: clave)
    end

    def verificador
      Rails.application.message_verifier(PROPOSITO)
    end
  end
end
