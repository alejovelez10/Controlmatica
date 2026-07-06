# frozen_string_literal: true

module Mcp
  # Filtrado genérico y seguro para búsquedas MCP.
  #
  # - `filters`: hash campo => valor. Solo se aplican claves que sean columnas REALES
  #   del modelo (whitelist contra model.column_names → sin inyección SQL). En columnas
  #   de texto se usa LIKE parcial case-insensitive; en el resto, igualdad exacta.
  # - `q`: texto libre; busca en TODAS las columnas string/text con OR LIKE.
  module Query
    def self.apply(model, scope, filters: nil, q: nil)
      cols = model.column_names
      string_cols = model.columns.select { |c| %i[string text].include?(c.type) }.map(&:name)

      if filters.is_a?(Hash)
        filters.each do |key, value|
          col = key.to_s
          next unless cols.include?(col)
          next if value.nil? || value == ""

          scope = if string_cols.include?(col) && value.is_a?(String)
                    scope.where("LOWER(#{col}) LIKE ?", "%#{value.downcase}%")
                  else
                    scope.where(col => value)
                  end
        end
      end

      if q.to_s != "" && string_cols.any?
        clause = string_cols.map { |c| "LOWER(#{c}) LIKE :q" }.join(" OR ")
        scope = scope.where(clause, q: "%#{q.to_s.downcase}%")
      end

      scope
    end
  end
end
