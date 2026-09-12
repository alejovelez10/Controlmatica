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

    # HOST DE LOS ENLACES QUE VIAJAN POR CORREO. Un mailer no tiene request, asi
    # que `expense_approval_url` no puede deducir el dominio: sin esto, ARMAR el
    # correo revienta con ArgumentError y el aviso de aprobacion no sale nunca.
    #
    # El default es el mismo dominio que ya estaba escrito a mano en
    # config/routes.rb y en la plantilla de aprobacion de reportes; APP_HOST lo
    # mueve sin tocar codigo (en local: APP_HOST=localhost:3000 APP_PROTOCOL=http).
    config.action_mailer.default_url_options = {
      host: ENV["APP_HOST"].presence || "controlmatica.herokuapp.com",
      protocol: ENV["APP_PROTOCOL"].presence || "https",
    }

    # `load_defaults 5.2` deja el DeliveryJob viejo, que Rails 7 ya no tiene y
    # que avisa por consola en cada envio. Solo afecta a `deliver_later`, y el
    # unico que lo usa es el aviso de aprobacion de gastos: los demas correos
    # del proyecto salen con `.deliver`, sincronos, y no pasan por aqui.
    config.action_mailer.delivery_job = "ActionMailer::MailDeliveryJob"

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

