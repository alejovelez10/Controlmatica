ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

require 'bundler/setup' # Set up gems listed in the Gemfile.
# Rails 6.1 usa ::Logger sin requerirlo; concurrent-ruby >= 1.3.5 ya no lo
# carga por el. Sin esta linea el arranque revienta con
# "uninitialized constant ActiveSupport::LoggerThreadSafeLevel::Logger".
require 'logger'
require 'bootsnap/setup' # Speed up boot time by caching expensive operations.
