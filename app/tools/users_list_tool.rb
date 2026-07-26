# frozen_string_literal: true

class UsersListTool < ApplicationTool
  tool_name "users_list"
  description "Lista usuarios del sistema (sin credenciales). Filtro opcional `q` (nombre/email) y rol_id. " \
              "Útil para obtener IDs de usuarios (ej. report_execute_id, user_execute_id)."
  input_schema(
    properties: {
      q:      { type: "string",  description: "Texto en nombre, apellidos o email" },
      rol_id: { type: "integer", description: "Filtra por rol" },
      limit:  { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id names last_names email document_type number_document rol_id created_at].freeze

  def self.call(server_context:, q: nil, rol_id: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = User.all
    scope = scope.where(rol_id: rol_id) if rol_id
    if q.present?
      scope = scope.where("LOWER(names) LIKE :t OR LOWER(last_names) LIKE :t OR LOWER(email) LIKE :t", t: "%#{q.downcase}%")
    end
    data = scope.includes(:rol).order(:names).limit(limit).map do |u|
      Mcp::Serialize.record(u, KEYS, rol_name: u.rol&.name)
    end
    json(data)
  end
end
