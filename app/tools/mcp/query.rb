# frozen_string_literal: true

module Mcp
  # Motor de consulta genérico y seguro para búsquedas MCP.
  #
  # `filters`: hash campo => condición. Solo se aplican claves que sean columnas
  # REALES del modelo (whitelist contra column_names → sin inyección SQL). El valor
  # de cada campo puede ser:
  #   * escalar            → igualdad (texto: LIKE parcial case-insensitive)
  #   * array              → IN (…)
  #   * hash de operadores → { "gte": 100, "lt": 500 }, { "in": [...] },
  #     { "like": "abc" }, { "not": null }, { "null": true }, { "between": [a, b] }, …
  #
  # Operadores soportados: eq, ne/not, gt, gte, lt, lte, like/ilike/contains,
  # starts_with, ends_with, in, nin/not_in, null (bool), between [a,b].
  module Query
    OPERATORS = %w[eq ne not gt gte lt lte like ilike contains starts_with ends_with
                   in nin not_in null between].freeze

    def self.apply(model, scope, filters: nil, q: nil)
      cols = model.column_names
      string_cols = text_columns(model)

      if filters.is_a?(Hash)
        filters.each do |key, value|
          col = key.to_s
          next unless cols.include?(col)

          scope = apply_field(scope, col, value, string_cols.include?(col))
        end
      end

      if q.to_s != "" && string_cols.any?
        clause = string_cols.map { |c| "LOWER(#{c}) LIKE :q" }.join(" OR ")
        scope = scope.where(clause, q: "%#{q.to_s.downcase}%")
      end

      scope
    end

    # Ordena por `sort`: string o array. "field" asc, "-field" desc, "field:desc".
    def self.order(model, scope, sort)
      return scope if sort.nil?

      cols = model.column_names
      clauses = Array(sort).flat_map { |s| s.to_s.split(",") }.filter_map do |raw|
        token = raw.strip
        next if token.empty?

        if token.start_with?("-")
          col = token[1..]
          dir = "DESC"
        elsif token.include?(":")
          col, d = token.split(":", 2)
          dir = d.to_s.downcase == "desc" ? "DESC" : "ASC"
        else
          col = token
          dir = "ASC"
        end
        cols.include?(col) ? "#{col} #{dir}" : nil
      end
      clauses.any? ? scope.order(Arel.sql(clauses.join(", "))) : scope
    end

    def self.text_columns(model)
      model.columns.select { |c| %i[string text].include?(c.type) }.map(&:name)
    end

    def self.apply_field(scope, col, value, is_string)
      case value
      when Hash
        value.each { |op, v| scope = apply_operator(scope, col, op.to_s, v) }
        scope
      when Array
        scope.where(col => value) # IN
      else
        if is_string && value.is_a?(String)
          scope.where("LOWER(#{col}) LIKE ?", "%#{value.downcase}%")
        else
          scope.where(col => value)
        end
      end
    end

    def self.apply_operator(scope, col, op, v)
      case op
      when "eq"                    then scope.where(col => v)
      when "ne", "not"             then v.nil? ? scope.where.not(col => nil) : scope.where.not(col => v)
      when "gt"                    then scope.where("#{col} > ?", v)
      when "gte"                   then scope.where("#{col} >= ?", v)
      when "lt"                    then scope.where("#{col} < ?", v)
      when "lte"                   then scope.where("#{col} <= ?", v)
      when "like", "ilike", "contains" then scope.where("LOWER(#{col}) LIKE ?", "%#{v.to_s.downcase}%")
      when "starts_with"           then scope.where("LOWER(#{col}) LIKE ?", "#{v.to_s.downcase}%")
      when "ends_with"             then scope.where("LOWER(#{col}) LIKE ?", "%#{v.to_s.downcase}")
      when "in"                    then scope.where(col => Array(v))
      when "nin", "not_in"         then scope.where.not(col => Array(v))
      when "null"                  then v ? scope.where(col => nil) : scope.where.not(col => nil)
      when "between"               then apply_between(scope, col, v)
      else scope
      end
    end

    def self.apply_between(scope, col, v)
      arr = Array(v)
      return scope unless arr.size == 2

      scope.where("#{col} BETWEEN ? AND ?", arr[0], arr[1])
    end
  end
end
