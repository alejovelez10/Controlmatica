module Claude
  # Deja un JSON Schema en la forma que acepta la salida estructurada de Claude
  # (paquete 17): los tipos que admiten null (`type: ["string", "null"]`) pasan
  # a `anyOf`, que es lo que la documentacion lista como soportado. Equivalente
  # en significado; el esquema original del servicio no se toca.
  module Esquema
    # Lo que describe al campo y no a uno de sus tipos.
    CLAVES_DEL_CAMPO = %w[description title].freeze

    module_function

    def compatible(nodo)
      case nodo
      when Hash
        nodo = nodo.deep_stringify_keys.transform_values { |valor| compatible(valor) }
        tipos = nodo["type"]
        return nodo unless tipos.is_a?(Array)

        del_campo = nodo.slice(*CLAVES_DEL_CAMPO)
        # items, properties, enum... pertenecen al tipo que no es null.
        del_tipo = nodo.except("type", *CLAVES_DEL_CAMPO)
        ramas = tipos.map { |tipo| tipo == "null" ? { "type" => "null" } : { "type" => tipo }.merge(del_tipo) }
        del_campo.merge("anyOf" => ramas)
      when Array
        nodo.map { |valor| compatible(valor) }
      else
        nodo
      end
    end
  end
end
