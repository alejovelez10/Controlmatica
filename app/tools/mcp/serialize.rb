# frozen_string_literal: true

module Mcp
  # Serializa records ActiveRecord a hashes explícitos (nunca AR crudo) para MCP.
  # Cada key es un método/atributo del record; valores extra se pasan en `extra`.
  module Serialize
    def self.record(rec, keys, extra = {})
      h = keys.each_with_object({}) { |k, acc| acc[k] = rec.public_send(k) }
      h.merge(extra)
    end

    def self.collection(recs, keys)
      recs.map { |r| record(r, keys) }
    end
  end
end
