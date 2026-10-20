# frozen_string_literal: true

# Doble de Claude::Client para las pruebas del agente (paquete 17). Devuelve
# una respuesta guionada por cada llamada, en orden, y guarda los cuerpos que
# recibio para poder afirmar que se le mando al modelo.
class FakeClaudeClient
  attr_reader :pedidos

  def initialize(*respuestas)
    @respuestas = respuestas.flatten
    @pedidos = []
  end

  def mensajes(cuerpo, betas: [])
    @pedidos << { cuerpo: cuerpo, betas: betas }
    respuesta = @respuestas.shift
    raise "FakeClaudeClient: se pidio una respuesta mas de las guionadas" if respuesta.nil?
    raise respuesta if respuesta.is_a?(Exception)

    respuesta.deep_stringify_keys
  end

  # --- Constructores de respuestas con la forma real de la API --------------

  def self.texto(texto)
    { content: [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text: texto }],
      stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 50 } }
  end

  # usos: [[nombre, input], ...]
  def self.tools(*usos)
    { content: usos.each_with_index.map do |(nombre, input), i|
      { type: "tool_use", id: "toolu_#{nombre}_#{i}_#{SecureRandom.hex(3)}", name: nombre, input: input }
    end,
      stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 30 } }
  end

  def self.rechazo
    { content: [], stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" },
      usage: { input_tokens: 10, output_tokens: 0 } }
  end
end
