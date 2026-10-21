module Agente
  # El prompt de sistema del agente (paquete 17).
  #
  # La VERSION es un digesto del prompt y de las herramientas. Claude liga su
  # razonamiento a la conversacion exacta que lo produjo, incluidos `system` y
  # `tools`: si un despliegue los cambia a mitad de una conversacion, esa
  # conversacion se cierra y la siguiente arranca con la version nueva.
  module Prompt
    # .markdown y no .md: el .slugignore de Heroku borra todos los *.md del
    # slug (y no admite excepciones), y el agente se quedaba sin prompt en
    # produccion (visto el 2026-10-20 con el primer mensaje real).
    RUTA = Rails.root.join("app/prompts/agente/sistema.markdown")

    module_function

    def texto
      @texto = nil unless Rails.env.production?
      @texto ||= File.read(RUTA).freeze
    end

    def version(herramientas)
      Digest::SHA256.hexdigest(texto + JSON.generate(herramientas))[0, 16]
    end
  end
end
