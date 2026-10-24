module Agente
  # Llama una tool del MCP de Controlmatica dentro del mismo proceso (paquete 17).
  #
  # Por MCP::Server#handle y no con `Tool.call` directo: el servidor valida los
  # argumentos contra el esquema (lo que el modelo escribe puede venir mal) y
  # convierte una excepcion en un resultado con isError, en vez de tumbar el
  # turno. El server_context es el mismo que arma McpController con los
  # headers X-Actor-*: el correo del usuario ya identificado (unico) y su
  # telefono.
  module McpEnProceso
    module_function

    # => { texto:, error: }
    def llamar(nombre, argumentos, usuario:, wa_id: nil)
      servidor = MCP::Server.new(
        name: "controlmatica-agente", version: "1.0.0",
        tools: McpController.mcp_tools,
        server_context: { api_key: ENV["MCP_API_KEY"], actor_email: usuario&.email, actor_phone: wa_id,
                          canal: "whatsapp" }
      )
      respuesta = servidor.handle({ jsonrpc: "2.0", id: SecureRandom.uuid, method: "tools/call",
                                    params: { name: nombre, arguments: argumentos } })
      if respuesta[:error]
        return { texto: "Error: #{respuesta.dig(:error, :message)}", error: true }
      end

      resultado = respuesta[:result] || {}
      texto = Array(resultado[:content]).filter_map { |bloque| bloque[:text] }.join("\n")
      { texto: texto, error: resultado[:isError] == true || texto.start_with?("Error", "Unauthorized", "Not found") }
    end

    # Lo mismo pero devolviendo el JSON ya leido, para las llamadas que hace el
    # codigo (crear, adjuntar) y no el modelo. nil si la tool no devolvio JSON.
    def llamar_json(nombre, argumentos, usuario:, wa_id: nil)
      respuesta = llamar(nombre, argumentos, usuario: usuario, wa_id: wa_id)
      datos = begin
        JSON.parse(respuesta[:texto])
      rescue JSON::ParserError
        nil
      end
      respuesta.merge(datos: datos)
    end
  end
end
