# frozen_string_literal: true

# Clase base de todas las tools MCP de Controlmatica.
#
# Controlmatica es single-tenant: el multi-tenant lo maneja Taimes de su lado.
# Por eso la integración usa un único secreto compartido (X-Api-Key) validado
# contra la variable de entorno MCP_API_KEY (cargada por `figaro` desde
# config/application.yml o el entorno del server).
#
# Responsabilidades:
#   * Autorizar cada request comparando el X-Api-Key contra MCP_API_KEY.
#   * Resolver el usuario "actor" (Administrador) que ejecuta las escrituras.
#   * Setear User.current durante las escrituras (los callbacks de los modelos de
#     Controlmatica hacen User.current.id → crashean si es nil). Ver gotcha en el
#     instructivo (ai-docs/INSTRUCTIVO-MCP.md, Paso 7).
#   * Helpers de respuesta (siempre JSON, nunca ActiveRecord crudo).
class ApplicationTool < MCP::Tool
  # Sentinel devuelto por current_tenant cuando la request está autorizada.
  # Las tools solo lo usan como "gate" de autorización; al ser single-tenant no
  # scopean queries por tenant (todo el dominio pertenece a la única empresa).
  TENANT = :controlmatica

  # Mensaje unico de "no se pudo identificar a la persona". Vive en el cuerpo de
  # la clase y NO dentro de `class << self`: una constante definida en la clase
  # singleton no la ve ninguna subclase (el lookup de constantes de un `def
  # self.call` recorre los ancestros de la CLASE, no los de su singleton), y las
  # tools de creacion la nombran a pelo.
  NO_ACTOR_MESSAGE =
    "Error: no se pudo identificar a la persona que reporta. Envia X-Actor-Phone o " \
    "X-Actor-Email de un usuario registrado en Controlmatica, o indica user_invoice_id " \
    "explicitamente. El gasto NO se registro."

  class << self
    # Autoriza la request comparando el X-Api-Key contra MCP_API_KEY (constante,
    # secure_compare para evitar timing attacks). Devuelve el sentinel TENANT o nil.
    def current_tenant(server_context)
      provided = server_context && server_context[:api_key]
      expected = mcp_api_key
      return nil if provided.to_s.empty? || expected.to_s.empty?
      return nil unless ActiveSupport::SecurityUtils.secure_compare(provided.to_s, expected.to_s)

      TENANT
    end

    def mcp_api_key
      ENV["MCP_API_KEY"]
    end

    # Usuario que "actúa" en las escrituras. En una API no hay usuario de request,
    # así que usamos el Administrador (primero por id) o, en su defecto, el primer user.
    #
    # Si el server_context trae actor_email (Taimes lo envía como X-Actor-Email),
    # se prioriza el usuario cuyo correo coincida (case-insensitive). Esto permite
    # atribuir la escritura al usuario real que la originó en Taimes en vez de a un
    # Administrador genérico. Sin match / sin email → fallback al Administrador.
    #
    # Desde el paquete 11 el telefono (X-Actor-Phone) se considera ANTES del
    # fallback: en WhatsApp no hay correo, y caer al Administrador con un
    # telefono valido en la mano seria perder al actor real por nada.
    #
    # OJO: este resolvedor sigue siendo el LAXO y solo debe usarse en LECTURAS.
    # Las escrituras usan actor_user_strict / as_actor_strict, que no tienen
    # fallback (arquitectura §6.3).
    def actor_user(_tenant = nil, server_context = nil)
      actor_user_strict(server_context) ||
        User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first ||
        User.order(:id).first
    end

    # Telefono del actor recibido en el server_context, ya normalizado, o nil.
    def actor_phone(server_context)
      User.normalize_phone(server_context && server_context[:actor_phone])
    end

    # Resuelve por telefono SIN caer al Administrador.
    #
    # DOS COINCIDENCIAS SIGNIFICAN NINGUN ACTOR, NUNCA "EL PRIMERO": el indice
    # de phone_normalized no es unico a proposito (dato heredado sucio), y
    # atribuirle un gasto al primero de dos homonimos es exactamente el error
    # que este paquete viene a impedir. El `limit(2)` existe para distinguir
    # "uno" de "mas de uno" sin traerse la tabla entera.
    def actor_user_by_phone(server_context)
      key = actor_phone(server_context)
      return nil if key.blank?

      matches = User.by_normalized_phone(key).order(:id).limit(2).to_a
      matches.size == 1 ? matches.first : nil
    end

    # Actor estricto: correo primero, telefono despues, SIN fallback.
    # El correo manda porque es el identificador que el usuario escribio; el
    # telefono es el que el gateway de WhatsApp adivino.
    def actor_user_strict(server_context)
      actor_user_by_email(server_context) || actor_user_by_phone(server_context)
    end

    # Correo del actor recibido en el server_context (normalizado), o nil.
    def actor_email(server_context)
      (server_context && server_context[:actor_email]).to_s.strip.downcase.presence
    end

    # Resuelve el usuario del actor por correo SIN caer al Administrador. Útil para
    # defaultear campos "quién reporta" solo cuando hay un match real de correo.
    def actor_user_by_email(server_context)
      email = actor_email(server_context)
      return nil unless email

      User.where("LOWER(email) = ?", email).order(:id).first
    end

    # Ejecuta un bloque con User.current seteado al actor (para callbacks que
    # dependen de Thread.current[:user]). Restaura el valor previo al terminar.
    def as_actor(tenant, server_context = nil)
      previous = User.current
      actor = actor_user(tenant, server_context)
      User.current = actor
      yield actor
    ensure
      User.current = previous
    end

    # Como as_actor pero ABORTA con NO_ACTOR_MESSAGE si no hay actor real.
    # Lo usan las tools que escriben a nombre de una persona (crear gasto, crear
    # anticipo, adjuntar comprobante).
    #
    # ⚠️ EL `ensure` VA EN UN `begin` INTERNO, NO A NIVEL DE METODO. Si se copia
    # el `def ... ensure ... end` de as_actor, el `return` temprano dispara el
    # ensure con `previous` todavia sin asignar y deja User.current = nil para
    # todo el resto del request (y, como Puma reusa hilos, potencialmente para
    # el siguiente). Hay un test dedicado a esto.
    def as_actor_strict(_tenant, server_context = nil)
      actor = actor_user_strict(server_context)
      return text(NO_ACTOR_MESSAGE) unless actor

      previous = User.current
      begin
        User.current = actor
        yield actor
      ensure
        User.current = previous
      end
    end

    # Envuelve un string en la respuesta MCP de texto.
    def text(str)
      MCP::Tool::Response.new([{ type: "text", text: str.to_s }])
    end

    # Envuelve un hash/array serializándolo a JSON (nunca AR crudo).
    def json(data)
      text(JSON.generate(data))
    end

    def unauthorized!
      text("Unauthorized: invalid or missing X-Api-Key")
    end

    def not_found!(what = "record")
      text("Not found: #{what}")
    end

    # Normaliza args: el SDK MCP entrega keys como símbolos; algunos service objects
    # esperan strings. Úsalo cuando necesites keys string.
    def stringify(hash)
      (hash || {}).transform_keys(&:to_s)
    end
  end
end
