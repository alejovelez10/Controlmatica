Rails.application.routes.draw do
  get 'employed_performance/show', to: 'employed_performance#show', as: 'employed_performance_show' 
  get 'employed_performance/info_pdf', to: 'employed_performance#info_pdf', as: 'info_pdf'
  resources :customer_invoices
  resources :sales_orders
  resources :customer_reports
  get 'aprobar_informe/:token', to: 'customer_reports#aprobar_informe', as: 'aprobar_informe'
  get 'aproacion_cliente/:report/:token', to: 'customer_reports#aproacion_cliente', as: 'aproacion_cliente'
  get 'cost_centers/change_state_ended/:id', to: 'cost_centers#change_state_ended', as: 'change_state_ended'

  get "customer_user/:id", to: "customers#customer_user", as: "customer_user"

  resources :parameterizations
  resources :reports
  resources :cost_centers
  resources :customers
  resources :providers
  resources :rols , :except => [:show]


  get "cost_center_customer/:id", to: "cost_centers#cost_center_customer", as: "cost_center_customer"

  get "user/new", to: "home#users_new", as: "new_users"
  get "users", to: "home#index_user", as: "users"
  devise_for :users, :controllers => { :registrations => "users/registrations" }

  devise_scope :user do
    post "create_user", to: "users/registrations#create_user", as: "create_user" 
    delete "user/:id", to: "users/registrations#delete_user", as: "delete_user"
    get "user/:id/edit", to: "users/registrations#user_edit", as: "user_edit"
    patch "update_user/:id", to: "users/registrations#update_user", as: "update_user"
  end

  root 'home#dashboard'
  get "home/dashboard", to: "home#dashboard", as: "user_home"
  get "customer_pdf/:id", to: "customer_reports#pdf_customer_report", as: "customer_pdf"
  get 'enviar_aprobacion/:report', to: 'customer_reports#enviar_aprobacion', as: 'enviar_aprobacion'


  get "get_contact/:id", to: "reports#get_contact", as: "get_contact"

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end


