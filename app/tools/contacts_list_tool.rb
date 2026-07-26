# frozen_string_literal: true

class ContactsListTool < ApplicationTool
  tool_name "contacts_list"
  description "Lista contactos. Filtros opcionales: customer_id, provider_id, q (nombre/email). " \
              "Devuelve hasta `limit` resultados."
  input_schema(
    properties: {
      customer_id: { type: "integer", description: "Filtra por cliente" },
      provider_id: { type: "integer", description: "Filtra por proveedor" },
      q:           { type: "string",  description: "Texto en nombre o email" },
      limit:       { type: "integer", description: "Máximo de resultados (default 50, máx 200)" }
    },
    required: []
  )

  KEYS = %i[id name email phone position customer_id provider_id created_at].freeze

  def self.call(server_context:, customer_id: nil, provider_id: nil, q: nil, limit: 50)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    limit = [[limit.to_i, 1].max, 200].min
    scope = Contact.all
    scope = scope.where(customer_id: customer_id) if customer_id
    scope = scope.where(provider_id: provider_id) if provider_id
    scope = scope.where("LOWER(name) LIKE :t OR LOWER(email) LIKE :t", t: "%#{q.downcase}%") if q.present?
    json(Mcp::Serialize.collection(scope.order(:name).limit(limit), KEYS))
  end
end
