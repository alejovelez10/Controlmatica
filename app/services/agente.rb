# El agente de WhatsApp de Controlmatica (paquete 17): registra gastos y
# reportes de servicio conversando. Reemplaza a los agentes "Asistente de
# Gastos" y "Reportes de Servicio" de Taimes; sus prompts se portaron a
# app/prompts/agente/sistema.md.
module Agente
  MODELO_POR_DEFECTO = "claude-opus-5-5".freeze

  # Topes por turno (de Taimes, step_limits.py: "Asistente de Gastos" 12/15).
  # El peor turno legitimo es una foto: centros + reglas + tipos + medios +
  # tasa + validar, unas 6 tools.
  MAX_PASOS = 12
  MAX_LLAMADAS_A_TOOLS = 15

  # Lo que dura un resumen con botones antes de vencer (instructivo de campo).
  VIGENCIA_BORRADOR = 15.minutes

  module_function

  def modelo = ENV["AGENTE_MODELO"].presence || MODELO_POR_DEFECTO

  # medium por defecto: es un agente de varios pasos con tools, no un chat.
  def effort = ENV["AGENTE_EFFORT"].presence || "medium"

  # El agente necesita a Claude y llama las tools del MCP en proceso, que
  # autorizan contra MCP_API_KEY.
  def configurado?
    Claude.configurado? && ENV["MCP_API_KEY"].present?
  end
end
