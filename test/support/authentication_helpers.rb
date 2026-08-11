# Helpers de autenticacion compartidos por toda la suite.
#
# Se autocarga desde test/test_helper.rb con
#   Dir[Rails.root.join("test/support/**/*.rb")].sort.each { |f| require f }
# Ningun test debe hacer require_relative de este archivo.
module AuthenticationHelpers
  # Contrasena unica de todas las fixtures de usuario (test/fixtures/users.yml).
  FIXTURE_PASSWORD = "password123".freeze

  # Ejecuta el bloque con User.current seteado y lo restaura al salir, incluso si
  # el bloque lanza.
  #
  # OBLIGATORIO alrededor de todo create/update/destroy de ReportExpense,
  # CostCenter, ExpenseBudget, Material, Contractor, Report y User: sus callbacks
  # leen User.current y sin el revientan con NoMethodError.
  #
  # Firma: as_user(user) { |user| ... } -> lo que devuelva el bloque
  def as_user(user)
    previous = User.current
    User.current = user
    yield user
  ensure
    User.current = previous
  end

  # Devise + User.current de una sola vez, para tests de integracion.
  #
  # OJO: sign_in de Devise entra por Warden y NO ejercita
  # ApplicationController#after_sign_in_path_for. Un test que quiera probar el
  # login real (y con el la redireccion post-login) debe hacer:
  #
  #   post user_session_path,
  #        params: { user: { email: users(:admin).email, password: FIXTURE_PASSWORD } }
  #
  # y para eso los ModuleControl "Reportes de servicios" y "Tablero de Ingenieros"
  # de module_controls.yml son imprescindibles: after_sign_in_path_for hace .id
  # sobre ModuleControl.find_by_name sin guarda de nil.
  #
  # Firma: sign_in_as(user) -> user
  def sign_in_as(user)
    sign_in user
    User.current = user
    user
  end

  # Firma: sign_out_current -> nil
  def sign_out_current
    sign_out :user
    User.current = nil
  end
end
