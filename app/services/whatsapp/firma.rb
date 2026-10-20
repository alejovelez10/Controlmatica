module Whatsapp
  # Firma de cada POST del webhook (paquete 17).
  #
  # Meta firma el CUERPO CRUDO con el App Secret y manda
  # `X-Hub-Signature-256: sha256=<hex>`. Se calcula sobre `request.raw_post`, no
  # sobre el JSON parseado: re-serializar cambia espacios y orden y la firma ya
  # no coincide.
  module Firma
    PREFIJO = "sha256=".freeze

    module_function

    def valida?(cuerpo, cabecera, secreto: Whatsapp.app_secret)
      return false if secreto.blank? || cabecera.blank?
      return false unless cabecera.start_with?(PREFIJO)

      esperada = OpenSSL::HMAC.hexdigest("SHA256", secreto, cuerpo.to_s)
      ActiveSupport::SecurityUtils.secure_compare(esperada, cabecera.delete_prefix(PREFIJO))
    end
  end
end
