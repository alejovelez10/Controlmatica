source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.1.2'
gem 'rails', '~> 6.1.7.6'
gem 'ffi', '< 1.17'
gem 'nokogiri', '< 1.18'
# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
# Use sqlite3 as the database for Active Record

# Use Puma as the app server
gem "puma", "~> 3.11"
# Use SCSS for stylesheets
gem "sass-rails", "~> 6.0"
# Use Uglifier as compressor for JavaScript assets
# gem "uglifier", ">= 1.3.0
gem 'terser'
# Transpile app-like JavaScript. Read more: https://github.com/rails/webpacker
gem "webpacker", "~> 5.0"
gem "webpacker-react", "~> 0.3.2"
# See https://github.com/rails/execjs#readme for more supported runtimes
# gem 'mini_racer', platforms: :ruby
gem 'webrick', '~> 1.7'
# OAuth
gem 'omniauth-oauth2'
# OmniAuth CSRF protection
gem 'omniauth-rails_csrf_protection'
# REST calls to Microsoft Graph
gem 'httparty'
# Session storage in database
gem 'activerecord-session_store'
gem 'net-imap', require: false
gem 'net-pop', require: false
gem 'net-smtp', require: false
gem 'date'    
# control de usuario
gem "devise"
# Use ActiveStorage variant
gem "mini_magick", "~> 4.8"
#AASM para maquina de estados
gem "aasm"
#ingresar con google
gem "omniauth-google"
#mensajes de alerta
gem "rails-assets-sweetalert2", "~> 5.1.1", source: "https://rails-assets.org"
gem "sweet-alert2-rails"
gem "toastr_rails"
#subir Archivos
gem "carrierwave"
gem "file_validators"
gem "chosen-rails"
#documentar modelos
gem "annotate"
#Guardar en amazon
# gem "fog", "~> 1.38"
gem "fog-aws"  # If you're using AWS
# Or specify an older version of fog that's compatible with Ruby 3.2.1
# gem "fog", "~> 1.37.0"
gem "figaro"
#Sub Formularios
gem "nested_form", :git => "https://github.com/ryanb/nested_form.git"
#paginacion
gem "will_paginate"
gem "react-rails"
gem "will_paginate-bootstrap"
#generar pdf
gem "wicked_pdf"

gem 'roo'

gem 'prawn-rails'
gem 'prawn-table'

#jquery
# gem "jquery-ui-rails"  # Remove
# gem "jquery-validation-rails"  # Remove unless specifically needed
gem "jquery-rails"
#Editor texto
gem "ckeditor_rails", "~> 4.5", ">= 4.5.10"
#bootstrap
gem "bootstrap", "~> 4.3.1"
gem "mini_racer", "~> 0.6.0"
gem "spreadsheet", "~> 1.2", ">= 1.2.5"

# Use CoffeeScript for .coffee assets and views
# gem "coffee-rails", "~> 4.2"  # CoffeeScript is largely deprecated
# Turbolinks makes navigating your web application faster. Read more: https://github.com/turbolinks/turbolinks
gem "turbolinks", "~> 5"  # Uncomment this line if you want to use turbolinks
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem "jbuilder", "~> 2.5"
# Use Redis adapter to run Action Cable in production
# gem 'redis', '~> 4.0'
# Use ActiveModel has_secure_password
# gem 'bcrypt', '~> 3.1.7'
gem "rack-cors"
gem "active_model_serializers", "~> 0.10.0"
# Use ActiveStorage variant
# gem 'mini_magick', '~> 4.8'

gem 'rubyzip', '>= 1.2.1'
gem 'axlsx', git: 'https://github.com/randym/axlsx.git', ref: 'c8ac844'
gem 'axlsx_rails'

# Use Capistrano for deployment
# gem 'capistrano-rails', group: :development

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", "~> 1.16.0", require: false

# Agregar estas gemas explícitamente para compatibilidad
gem 'logger', '~> 1.5'
gem 'activesupport', '~> 6.1.7.6'
gem 'concurrent-ruby', '~> 1.2.2'

group :development, :test do
  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem "byebug", platforms: [:mri, :mingw, :x64_mingw]
end

group :development do
  # Access an interactive console on exception pages or by calling 'console' anywhere in the code.
  gem "web-console", ">= 3.3.0"
  gem "listen", "~> 3.5"
  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem "spring"
  gem "solargraph"
  gem "spring-watcher-listen", "~> 2.0.0"
end

group :test do
  # Adds support for Capybara system testing and selenium driver
  gem "capybara", ">= 2.15"
  gem "selenium-webdriver"
  # Easy installation and use of chromedriver to run system tests with Chrome
  gem "chromedriver-helper"
end

group :production do
  gem "pg"

end

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
