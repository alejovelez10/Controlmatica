# Paginas que se ven sin iniciar sesion (paquete 17).
#
# Hereda de ActionController::Base y no de ApplicationController a proposito:
# ApplicationController carga el usuario de la sesion en cada request, y esta
# pagina la abre Meta (y cualquiera) sin cuenta.
class PaginasPublicasController < ActionController::Base
  layout false

  # La URL de politica de privacidad que Meta pide para publicar la app de
  # WhatsApp.
  def privacidad; end
end
