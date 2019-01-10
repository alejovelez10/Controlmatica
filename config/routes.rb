Rails.application.routes.draw do
  resources :parameterizations
  resources :reports
  resources :cost_centers
  resources :customers
  resources :providers
  resources :rols , :except => [:show]
  get 'contacts/index'
  get 'contacts/create'
  get 'contacts/destroy'
  devise_for :users, :controllers => { :registrations => "users/registrations" }
  root 'home#dashboard'

  get "home/dashboard", to: "home#dashboard", as: "user_home"

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
