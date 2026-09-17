ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# Autoload de dobles y helpers. CONVENCION DEL PROYECTO (00-ARQUITECTURA.md 7.2):
# todo doble o helper de test vive en test/support/ y se carga desde aqui.
# Esta PROHIBIDO el require_relative dentro de un test para cargar un doble.
Dir[Rails.root.join("test/support/**/*.rb")].sort.each { |file| require file }

class ActiveSupport::TestCase
  # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
  fixtures :all

  # NO agregar paralelismo de procesos aqui: la suite corre en serie mientras
  # ReportExpense.search siga
  # definiendo scopes de CLASE en runtime (arquitectura, invariante 6). Con
  # procesos paralelos esos scopes se pisan entre si y producen fallos
  # intermitentes indistinguibles de bugs reales.

  include AuthenticationHelpers
  include PermissionHelpers
  include JsonHelpers
  include UploadHelpers
  include ExpenseApprovalHelpers
  include DocumentationHelpers
  # `deliver_later` encola un job. Sin este helper, `assert_enqueued_emails` no
  # existe y el adaptador de test tampoco esta puesto: los correos se irian por
  # el adaptador :async, en otro hilo, y ninguna prueba podria verlos.
  include ActiveJob::TestHelper
  # `assert_enqueued_emails` / `assert_no_enqueued_emails` viven aqui, no en
  # ActiveJob::TestHelper.
  include ActionMailer::TestHelper

  teardown do
    # User.current es Thread.current[:user] y SOBREVIVE entre tests del mismo
    # hilo. Sin este teardown, un test que lo deja seteado hace pasar (o fallar)
    # al siguiente por accidente, y como Minitest randomiza el orden el fallo es
    # intermitente.
    User.current = nil
  end
end

class ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
end

class ActionController::TestCase
  include Devise::Test::ControllerHelpers
end
