Rails.application.routes.draw do
  get "commissions/index"
  get "commission_relations/index"
  get "get_show_center/:id", to: "cost_centers#get_show_center"
  get "employed_performance/show", to: "employed_performance#show", as: "employed_performance_show"
  get "employed_performance/info_pdf", to: "employed_performance#info_pdf", as: "info_pdf"
  get "employed_performance/info_pdf_new", to: "employed_performance#info_pdf_new", as: "info_pdf_new"
  resources :customer_invoices
  resources :sales_orders
  resources :customer_reports
  get "aprobar_informe/:token", to: "customer_reports#aprobar_informe", as: "aprobar_informe"
  get "aproacion_cliente/:report/:token", to: "customer_reports#aproacion_cliente", as: "aproacion_cliente"
  get "cost_centers/change_state_ended/:id", to: "cost_centers#change_state_ended", as: "change_state_ended"
  patch "update_sales_state_cost_center/:id/:state", to: "cost_centers#update_sales_state_cost_center"
  patch "update_state_report_expense/:id/:state", to: "report_expenses#update_state_report_expense"

  get "customer_user/:id", to: "customers#customer_user", as: "customer_user"

  match '/auth/:provider/callback', :to => 'auth#callback', :via => [:get, :post]

  resources :parameterizations, :except => [:new, :edit]
  resources :reports
  resources :cost_centers, :except => [:new, :edit]
  resources :customers
  resources :providers
  resources :rols, :except => [:show]
  resources :expense_ratios

  resources :commission_relations, :except => [:show, :edit, :new]
  resources :commissions, :except => [:show, :edit, :new]
  resources :shifts, :except => [:show, :edit, :new]
  resources :quotations, :except => [:show, :edit, :new]
  
  get "get_cost_center_report_expenses/:id", to: "report_expenses#get_cost_center_report_expenses"
  get "get_quotations/:cost_center_id", to: "quotations#get_quotations"
  get "get_shift_info/:shift_id", to: "shifts#get_shift_info"
  get "get_cost_center_description/:cost_center_id", to: "shifts#get_cost_center_description"
  get 'auth/signout'
  get "get_shifts/(:from)", to: "shifts#get_shifts"
  get "shifts/calendar/:from", to: "shifts#calendar" , as: "shift_calendar"
  get "get_shifts_const_center/:const_center_id", to: "shifts#get_shifts_const_center"

  ## commissions routes
  get "download_file/commissions/:type", to: "commissions#download_file"
  get "get_commission_relations", to: "commission_relations#get_commission_relations"
  get "get_commissions", to: "commissions#get_commissions"
  patch "update_state_commission/:id/:state", to: "commissions#update_state_commission"
  patch "update_filter_values_commissions", to: "commissions#update_filter_values_commissions"
  get "download_file/commissions/:type", to: "commissions#download_file"

  #commission_relations
  get "get_commission_relations", to: "commission_relations#get_commission_relations"
  get "commission_relations_pdf/:id", to: "commission_relations#pdf"
  post "get_info_cost_center/:cost_center_id", to: "cost_centers#get_info_cost_center"

  get "get_info_inovoice/:invoice_id", to: "cost_centers#get_info_inovoice"
  
  resources :module_controls
  resources :accion_modules
  get "get_report_expense_options", to: "report_expense_options#get_report_expense_options"
  resources :report_expense_options, :except => [:show, :edit, :new]

  resources :materials
  resources :contractors
  resources :material_invoices
  resources :alerts, :except => [:show, :new, :edit]
  resources :report_expenses, :except => [:show, :new, :edit]
  patch "update_filter_values", to: "report_expenses#update_filter_values"
  get "download_file/report_expenses/:type", to: "report_expenses#download_file"

  post "upload_file/report_expenses", to: "report_expenses#upload_file"
  get "indicators_expenses", to: "report_expenses#indicators_expenses"
  get "get_report_expenses", to: "report_expenses#get_report_expenses"
  resources :notification_alerts, :only => [:index]

  get "get_expense_ratios", to: "expense_ratios#get_expense_ratios"
  get "expense_ratio_pdf/:id", to: "expense_ratios#pdf", as: "expense_ratio_pdf"
  patch "register_edit_update_all", to: "register_edits#update_all"
  patch "notification_alerts_update_all", to: "notification_alerts#update_all"

  get "get_alerts", to: "alerts#get_alerts"
  get "informes/controlmatica", to: "reports#controlmatica", as: "controlmatica"
  get "get_informes", to: "reports#get_informes"

  default_url_options :host => "controlmatica.herokuapp.com"

  get "customer_cost_center/:id(/:location)", to: "cost_centers#customer_cost_center", as: "customer_cost_center"
  get "get_client/:id(/:location)", to: "customers#get_client", as: "get_client"

  get "report_user/:id", to: "customers#report_user", as: "report_user"

  get "user/new", to: "home#users_new", as: "new_users"
  get "users", to: "home#index_user", as: "users"
  devise_for :users, :controllers => { :registrations => "users/registrations" }

  devise_scope :user do
    post "create_user", to: "users/registrations#create_user", as: "create_user"
    delete "user/:id", to: "users/registrations#delete_user", as: "delete_user"
    get "user/:id/edit", to: "users/registrations#user_edit", as: "user_edit"
    patch "update_user/:id", to: "users/registrations#update_user", as: "update_user"
    get "menu/:id/:name", to: "users/registrations#menu", as: "menu"
    get "get_users", to: "users/registrations#get_users"
  end

  post "create_contact", to: "customers#create_contact"
  #react routes

  get "get_parameterizations", to: "parameterizations#get_parameterizations"
  get "get_providers", to: "providers#get_providers"
  get "get_customers", to: "customers#get_customers"
  get "get_customer_reports", to: "customer_reports#get_customer_reports"
  get "get_cost_centers", to: "cost_centers#get_cost_centers"
  get "get_sales_order", to: "sales_orders#get_sales_order"
  get "get_reports", to: "reports#get_reports"
  get "get_rols", to: "rols#get_rols"

  get "get_report_value/:id", to: "customer_reports#get_report_value"

  get "get_contractors", to: "contractors#get_contractors"
  get "get_materials", to: "materials#get_materials"

  get "get_accions", to: "accion_modules#get_accions", as: "get_accions"
  get "get_accion_modules/:id", to: "module_controls#get_accion_modules", as: "get_accion_modules"

  get "cost_centers/materials/:id", to: "cost_centers#materials"
  get "contractors", to: "cost_centers#contractors"
  get "get_roles", to: "home#get_roles"

  get "modules", to: "module_controls#get_actions", as: "modules"

  get "get_material_invoice/:id", to: "material_invoices#get_material_invoice"
  get "get_sales_order_invoice/:id", to: "sales_orders#get_sales_order_invoice"

  patch "update_state/:id", to: "register_edits#update_state"

  post "update_state_materials/:id/:state", to: "materials#update_state_materials"

  post "update_cost_centers/:id/:from/:state", to: "cost_centers#update_state_centro"

  get "getValues/:id", to: "cost_centers#getValues"

  #subir archvos

  post "import_customers", to: "customers#import_customers"
  post "import_providers", to: "providers#import_providers"

  #DESCARGAS DE EXEL

  get "download_file/providers", to: "providers#download_file"
  get "download_file/customers", to: "customers#download_file"
  get "download_file/users", to: "home#download_file"
  get "download_file/cost_centers/:ids", to: "cost_centers#download_file"
  get "download_file/reports/:ids", to: "reports#download_file"
  get "download_file/contractors/:ids", to: "contractors#download_file"
  get "download_file/materials/:ids", to: "materials#download_file"
  get "download_file/customer_reports", to: "customer_reports#download_file"
  get "download_file/sales_orders/:ids", to: "sales_orders#download_file"

  get "update_load/:id", to: "material_invoices#update_load"

  get "notifications", to: "register_edits#notifications", as: "notifications"
  get "get_notifications/:state", to: "register_edits#get_notifications"

  patch "update_state_notification_alert/:id", to: "notification_alerts#update_state"
  get "get_notifications_alerts/:state", to: "notification_alerts#get_notifications_alerts"

  root "home#dashboard"
  get "home/dashboard", to: "home#dashboard", as: "user_home"
  get "home/dashboard_ing", to: "home#dashboard_ing", as: "dashboard_ing"
  get "home/get_dashboard_ing/:id/:user_id/:count", to: "home#get_dashboard_ing", as: "get_dashboard_ing"
  get "home/get_dashboard_two_ing/:id/:user_id", to: "home#get_dashboard_two_ing", as: "get_dashboard_two_ing"
  get "home/get_dashboard_three_ing/:ye/:mo/:user_id", to: "home#get_dashboard_three_ing", as: "get_dashboard_three_ing"
  get "home/get_dashboard_four_ing/:id/:user_id", to: "home#get_dashboard_four_ing", as: "get_dashboard_four_ing"
  get "home/get_dashboard_five_ing/:id/:user_id", to: "home#get_dashboard_five_ing", as: "get_dashboard_five_ing"

  get "customer_pdf/:id", to: "customer_reports#pdf_customer_report", as: "customer_pdf"
  get "enviar_aprobacion/:report", to: "customer_reports#enviar_aprobacion", as: "enviar_aprobacion"

  get "get_contact/:id", to: "reports#get_contact", as: "get_contact"

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
