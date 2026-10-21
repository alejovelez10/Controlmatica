# frozen_string_literal: true

require "test_helper"

# El prompt de sistema del agente (paquete 17).
class Agente::PromptTest < ActiveSupport::TestCase
  # Visto el 2026-10-20 con el primer mensaje real: el .slugignore borraba los
  # *.md del slug y el agente fallaba con Errno::ENOENT en produccion, aunque
  # aqui el archivo existia y todas las pruebas pasaban.
  test "el .slugignore de Heroku no borra el prompt" do
    ruta = Agente::Prompt::RUTA.relative_path_from(Rails.root).to_s
    patrones = File.readlines(Rails.root.join(".slugignore")).map(&:strip)
                   .reject { |linea| linea.empty? || linea.start_with?("#") }

    borrado_por = patrones.find do |patron|
      if patron.end_with?("/")
        ruta.start_with?(patron) || ruta.include?("/#{patron}")
      else
        File.fnmatch?(patron, File.basename(ruta)) || File.fnmatch?(patron, ruta, File::FNM_PATHNAME)
      end
    end

    assert_nil borrado_por, "#{ruta} coincide con '#{borrado_por}' del .slugignore y no llegaria a Heroku"
  end

  test "el prompt existe y no esta vacio" do
    assert_operator Agente::Prompt.texto.length, :>, 500
  end
end
