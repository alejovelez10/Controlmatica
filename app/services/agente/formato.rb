module Agente
  # Pasa a formato de WhatsApp lo que el modelo escribe en markdown (paquete 17).
  # Red de seguridad: el prompt ya pide formato de WhatsApp, pero un **negrita**
  # o un ## titulo se cuelan y en el telefono se ven con los simbolos.
  module Formato
    module_function

    def para_whatsapp(texto)
      return "" if texto.blank?

      texto.to_s
           .gsub(/\*\*(.+?)\*\*/m, '*\1*')
           .gsub(/__(.+?)__/m, '_\1_')
           .gsub(/^\s{0,3}\#{1,6}\s+(.+)$/) { "*#{Regexp.last_match(1).strip}*" }
           .gsub(/\[([^\]]+)\]\((https?:[^)]+)\)/, '\1: \2')
           .gsub(/\n{3,}/, "\n\n")
           .strip
    end
  end
end
