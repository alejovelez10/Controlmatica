# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
#
# `entry` es el cuerpo del webhook de WhatsApp (paquete 17): trae el texto de
# los mensajes, el nombre y el celular de quien escribe, y tambien los de los
# otros numeros de la misma cuenta de Meta (el 316). Va exacto porque un
# simbolo filtraria cualquier clave que lo contenga.
Rails.application.config.filter_parameters += [:password, :api_key, /\Aentry\z/]
