# Canal propio de WhatsApp (paquete 17): Meta Cloud API directo, sin Taimes ni
# Twilio. Este modulo solo guarda la configuracion; el resto vive en
# app/services/whatsapp/.
module Whatsapp
  GRAPH_HOST = "https://graph.facebook.com".freeze
  GRAPH_VERSION_POR_DEFECTO = "v25.0".freeze

  # Lo minimo para hablar con Meta. Sin esto el canal no puede ni contestar.
  CLAVES_REQUERIDAS = %w[WHATSAPP_TOKEN WHATSAPP_PHONE_NUMBER_ID META_APP_SECRET].freeze

  module_function

  def configurado?
    CLAVES_REQUERIDAS.all? { |clave| ENV[clave].present? }
  end

  # Kill switch: arranca APAGADO. Con el canal apagado el webhook contesta 200
  # y no hace nada, para que Meta no lo marque como caido.
  def habilitado?
    configurado? && ENV["WHATSAPP_ENABLED"].to_s.strip.casecmp("true").zero?
  end

  def phone_number_id = ENV["WHATSAPP_PHONE_NUMBER_ID"]
  def token = ENV["WHATSAPP_TOKEN"]
  def app_secret = ENV["META_APP_SECRET"]
  def verify_token = ENV["WHATSAPP_VERIFY_TOKEN"]
  def graph_version = ENV["WHATSAPP_GRAPH_VERSION"].presence || GRAPH_VERSION_POR_DEFECTO
end
