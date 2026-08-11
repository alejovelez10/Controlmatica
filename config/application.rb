require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Controlmatica
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 5.2

    # Habilita el `format` por modelo/atributo de los mensajes de error.
    #
    # Lo necesita config/locales/expense_budget.en.yml: la regla de tope de las
    # partidas presupuestales devuelve frases completas que el contrato A.5
    # publica palabra por palabra, y `full_messages` les anteponia el nombre del
    # atributo en ingles ("Amount La suma de las partidas...").
    #
    # No cambia el comportamiento de ningun otro modelo: solo habilita una
    # busqueda de i18n adicional, y la unica clave `format` definida en el
    # proyecto es la de `expense_budget.amount`.
    config.active_model.i18n_customize_full_message = true
    config.middleware.insert_before 0, Rack::Cors do
        allow do
            origins '*'
            resource '*',
                    headers: :any,
                    methods: %I[get post options delete patch puts]
        end
    end
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration can go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded after loading
    # the framework and any gems in your application.
  end
end

