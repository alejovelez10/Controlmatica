Rails.application.routes.draw do
  resources :customer_invoices
  resources :sales_orders
  resources :customer_reports
  get 'aprobar_informe/:token', to: 'customer_reports#aprobar_informe', as: 'aprobar_informe'
  get 'aproacion_cliente/:report/:token', to: 'customer_reports#aproacion_cliente', as: 'aproacion_cliente'


  resources :parameterizations
  resources :reports
  resources :cost_centers
  resources :customers
  resources :providers
  resources :rols , :except => [:show]
  get 'contacts/index'
  get 'contacts/create'
  get 'contacts/destroy'


  get "user/new", to: "home#users_new", as: "new_users"
  get "user/all", to: "home#index_user", as: "user"
  devise_for :users, :controllers => { :registrations => "users/registrations" }

  devise_scope :user do
    post "create_user", to: "users/registrations#create_user", as: "create_user" 
  end

  root 'home#dashboard'
  get "home/dashboard", to: "home#dashboard", as: "user_home"
  get "customer_pdf/:id", to: "customer_reports#pdf_customer_report", as: "customer_pdf"
  get 'enviar_aprobacion/:report', to: 'customer_reports#enviar_aprobacion', as: 'enviar_aprobacion'


  get "get_contact/:id", to: "reports#get_contact", as: "get_contact"

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end

