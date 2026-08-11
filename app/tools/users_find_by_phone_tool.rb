# frozen_string_literal: true

class UsersFindByPhoneTool < ApplicationTool
  tool_name "users_find_by_phone"
  description "Identifica a una persona de Controlmatica por su número de teléfono (acepta " \
              "cualquier formato: +57 300 123 4567, 3001234567, whatsapp:+573001234567). " \
              "Devuelve found:false si no hay match o si el número está repetido en dos usuarios. " \
              "NUNCA asumas una persona si found es false."
  input_schema(
    properties: { phone: { type: "string", description: "Número de teléfono en cualquier formato" } },
    required: %w[phone]
  )

  # ⚠️ ALLOWLIST EXPLÍCITA Y CORTA A PROPÓSITO. La tabla `users` contiene
  # encrypted_password, reset_password_token, current_sign_in_ip y
  # last_sign_in_ip: ninguno puede salir por aquí. Agregar una clave a esta
  # lista es una decisión de seguridad, no de comodidad.
  KEYS = %i[id names last_names email rol_id].freeze

  def self.call(phone:, server_context:)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    key = User.normalize_phone(phone)
    if key.blank?
      return json(found: false, reason: "invalid_phone",
                  message: "El número no tiene suficientes dígitos.")
    end

    matches = User.by_normalized_phone(key).order(:id).limit(2).to_a

    case matches.size
    when 0
      json(found: false, reason: "no_match",
           message: "No hay ningún usuario de Controlmatica con ese teléfono. Pídele a la persona " \
                    "que se identifique con su correo o contacta al administrador para que " \
                    "registre su número.")
    when 1
      usuario = matches.first
      json(found: true,
           user: Mcp::Serialize.record(usuario, KEYS, rol_name: usuario.rol&.name))
    else
      # DOS COINCIDENCIAS = NINGUNA PERSONA. Pasa de verdad (jefe y asistente
      # comparten línea) y elegir "la primera por id" atribuiría el gasto a
      # quien no lo hizo.
      json(found: false, reason: "ambiguous",
           message: "Ese teléfono está registrado en más de un usuario. No es posible atribuir " \
                    "el gasto.")
    end
  end
end
