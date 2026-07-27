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
    def actor_user(_tenant = nil, server_context = nil)
      email = actor_email(server_context)
      if email
        matched = User.where("LOWER(email) = ?", email).order(:id).first
        return matched if matched
      end
      User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first ||
        User.order(:id).first
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
