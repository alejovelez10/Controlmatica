Rails.application.routes.draw do
  resources :customer_reports
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
  get 'aprobar_informe/:token', to: 'customer_reports#aprobar_informe', as: 'aprobar_informe'
  get "home/dashboard", to: "home#dashboard", as: "user_home"
  get "customer_pdf/:id", to: "customer_reports#pdf_customer_report", as: "customer_pdf"

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end

