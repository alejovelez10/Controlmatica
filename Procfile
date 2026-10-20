web: bundle exec puma -C config/puma.rb
worker: bundle exec good_job start --max-threads=2
release: bin/rails db:migrate
