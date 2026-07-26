namespace :db do
  namespace :seed do
    desc "Load the staging seed data from db/seeds_staging.rb"
    task staging: :environment do
      load(Rails.root.join('db', 'seeds_staging.rb'))
    end
  end
end
