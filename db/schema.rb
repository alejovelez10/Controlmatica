# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2026_02_18_000003) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "accion_modules", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.integer "user_id"
    t.integer "module_control_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["module_control_id"], name: "index_accion_modules_on_module_control_id"
    t.index ["name"], name: "index_accion_modules_on_name"
  end

  create_table "accion_modules_rols", id: false, force: :cascade do |t|
    t.bigint "rol_id", null: false
    t.bigint "accion_module_id", null: false
    t.index ["accion_module_id", "rol_id"], name: "index_accion_modules_rols_on_accion_module_id_and_rol_id"
    t.index ["rol_id", "accion_module_id"], name: "index_accion_modules_rols_on_rol_id_and_accion_module_id"
  end

  create_table "alerts", force: :cascade do |t|
    t.string "name"
    t.integer "ing_ejecucion_min"
    t.integer "ing_ejecucion_med"
    t.integer "ing_ejecucion_max"
    t.integer "ing_costo_min"
    t.integer "ing_costo_med"
    t.integer "ing_costo_max"
    t.integer "tab_ejecucion_min"
    t.integer "tab_ejecucion_med"
    t.integer "tab_ejecucion_max"
    t.integer "tab_costo_min"
    t.integer "tab_costo_med"
    t.integer "tab_costo_max"
    t.integer "desp_min"
    t.integer "desp_med"
    t.integer "desp_max"
    t.integer "mat_min"
    t.integer "mat_med"
    t.integer "mat_max"
    t.integer "via_min"
    t.integer "via_med"
    t.integer "via_max"
    t.integer "total_min"
    t.integer "total_med"
    t.integer "tatal_max"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "alert_min", default: 100
    t.string "color_min", default: "#d26666"
    t.integer "alert_med", default: 150
    t.string "color_mid", default: "#d4b21e"
    t.integer "alert_max", default: 151
    t.string "color_max", default: "#24bc6b"
    t.integer "alert_hour_min", default: 100
    t.integer "alert_hour_med", default: 100
    t.integer "alert_hour_max", default: 100
    t.string "color_hour_min", default: "#d26666"
    t.string "color_hour_med", default: "#d4b21e"
    t.string "color_hour_max", default: "#24bc6b"
    t.float "commision_porcentaje"
  end

  create_table "commission_relations", force: :cascade do |t|
    t.date "creation_date"
    t.integer "user_report_id"
    t.date "start_date"
    t.date "end_date"
    t.string "area"
    t.text "observations"
    t.integer "user_direction_id"
    t.integer "last_user_edited_id"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "commissions", force: :cascade do |t|
    t.integer "user_id"
    t.integer "user_invoice_id"
    t.date "start_date"
    t.date "end_date"
    t.integer "customer_invoice_id"
    t.text "observation"
    t.float "hours_worked"
    t.float "total_value"
    t.boolean "is_acepted", default: false
    t.integer "last_user_edited_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "cost_center_id"
    t.integer "customer_report_id"
    t.float "value_hour"
    t.index ["cost_center_id"], name: "index_commissions_on_cost_center_id"
  end

  create_table "contacts", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.string "phone"
    t.integer "provider_id"
    t.string "position"
    t.integer "user_id"
    t.integer "customer_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_contacts_on_customer_id"
    t.index ["provider_id"], name: "index_contacts_on_provider_id"
  end

  create_table "contractors", force: :cascade do |t|
    t.string "sales_number"
    t.date "sales_date"
    t.float "ammount"
    t.integer "cost_center_id"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.float "hours"
    t.integer "user_execute_id"
    t.integer "update_user"
    t.integer "last_user_edited_id"
    t.index "EXTRACT(year FROM sales_date)", name: "index_contractors_on_sales_date_year"
    t.index "EXTRACT(year FROM sales_date), EXTRACT(month FROM sales_date)", name: "index_contractors_on_sales_date_year_month"
    t.index ["cost_center_id"], name: "index_contractors_on_cost_center_id"
  end

  create_table "cost_centers", force: :cascade do |t|
    t.integer "customer_id"
    t.integer "contact_id"
    t.text "description"
    t.date "start_date"
    t.date "end_date"
    t.string "quotation_number"
    t.float "engineering_value"
    t.float "viatic_value"
    t.string "execution_state"
    t.string "invoiced_state"
    t.string "service_type"
    t.string "code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "count"
    t.boolean "create_type"
    t.float "eng_hours"
    t.float "hour_cotizada"
    t.float "hour_real"
    t.float "quotation_value"
    t.float "work_force_contractor"
    t.float "hours_contractor"
    t.float "hours_contractor_invoices"
    t.float "hours_contractor_real"
    t.float "materials_value"
    t.integer "user_id"
    t.string "sum_materials"
    t.string "sum_contractors"
    t.string "sum_executed"
    t.float "sum_viatic"
    t.float "ingenieria_total_costo", default: 0.0
    t.float "sum_materials_costo", default: 0.0
    t.float "sum_materials_cot", default: 0.0
    t.float "contractor_total_costo", default: 0.0
    t.float "sum_contractor_costo", default: 0.0
    t.float "sum_contractor_cot", default: 0.0
    t.float "sum_materials_value", default: 0.0
    t.float "displacement_hours"
    t.float "value_displacement_hours"
    t.float "offset_value"
    t.integer "update_user"
    t.float "ing_horas_eje", default: 0.0
    t.float "ing_horas_porcentaje", default: 0.0
    t.float "ing_costo_cotizado", default: 0.0
    t.float "ing_costo_real", default: 0.0
    t.float "ing_costo_porcentaje", default: 0.0
    t.float "cont_horas_eje", default: 0.0
    t.float "cont_horas_porcentaje", default: 0.0
    t.float "cont_costo_cotizado", default: 0.0
    t.float "cont_costo_real", default: 0.0
    t.float "cont_costo_porcentaje", default: 0.0
    t.float "mat_costo_real", default: 0.0
    t.float "mat_costo_porcentaje", default: 0.0
    t.float "viat_costo_real", default: 0.0
    t.float "viat_costo_porcentaje", default: 0.0
    t.float "fact_real", default: 0.0
    t.float "fact_porcentaje", default: 0.0
    t.float "desp_horas_eje", default: 0.0
    t.float "desp_horas_porcentaje", default: 0.0
    t.float "aiu", default: 0.0
    t.float "aiu_percent", default: 0.0
    t.float "aiu_real", default: 0.0
    t.float "aiu_percent_real", default: 0.0
    t.float "total_expenses", default: 0.0
    t.integer "last_user_edited_id"
    t.integer "user_owner_id"
    t.string "sales_state", default: "SIN COMPRAS"
    t.boolean "has_many_quotes", default: false
    t.index "EXTRACT(year FROM start_date)", name: "index_cost_centers_on_start_date_year"
    t.index ["contact_id"], name: "index_cost_centers_on_contact_id"
    t.index ["created_at"], name: "index_cost_centers_on_created_at"
    t.index ["customer_id"], name: "index_cost_centers_on_customer_id"
    t.index ["execution_state"], name: "index_cost_centers_on_execution_state"
    t.index ["invoiced_state"], name: "index_cost_centers_on_invoiced_state"
    t.index ["last_user_edited_id"], name: "index_cost_centers_on_last_user_edited_id"
    t.index ["service_type"], name: "index_cost_centers_on_service_type"
    t.index ["start_date"], name: "index_cost_centers_on_start_date"
    t.index ["user_id"], name: "index_cost_centers_on_user_id"
    t.index ["user_owner_id"], name: "index_cost_centers_on_user_owner_id"
  end

  create_table "customer_invoices", force: :cascade do |t|
    t.integer "cost_center_id"
    t.integer "sales_order_id"
    t.float "invoice_value"
    t.date "invoice_date"
    t.string "delivery_certificate_file"
    t.string "delivery_certificate_state"
    t.string "reception_report_file"
    t.string "reception_report_state"
    t.string "invoice_state"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "number_invoice"
    t.float "engineering_value", default: 0.0
    t.float "others_value", default: 0.0
    t.index "EXTRACT(year FROM invoice_date)", name: "index_customer_invoices_on_invoice_date_year"
    t.index ["cost_center_id"], name: "index_customer_invoices_on_cost_center_id"
    t.index ["sales_order_id"], name: "index_customer_invoices_on_sales_order_id"
  end

  create_table "customer_reports", force: :cascade do |t|
    t.date "report_date"
    t.text "description"
    t.string "token"
    t.string "report_state"
    t.string "report_code"
    t.integer "customer_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.integer "cost_center_id"
    t.integer "contact_id"
    t.integer "count"
    t.date "approve_date"
    t.string "email"
    t.integer "update_user"
    t.integer "last_user_edited_id"
    t.index ["cost_center_id"], name: "index_customer_reports_on_cost_center_id"
  end

  create_table "customer_reports_reports", id: false, force: :cascade do |t|
    t.bigint "customer_report_id", null: false
    t.bigint "report_id", null: false
  end

  create_table "customers", force: :cascade do |t|
    t.string "client"
    t.string "name"
    t.string "phone"
    t.string "address"
    t.string "nit"
    t.string "web"
    t.string "email"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "code"
    t.index ["code"], name: "index_customers_on_code"
    t.index ["created_at"], name: "index_customers_on_created_at"
    t.index ["name"], name: "index_customers_on_name"
  end

  create_table "expense_ratios", force: :cascade do |t|
    t.date "creation_date"
    t.integer "user_report_id"
    t.date "start_date"
    t.date "end_date"
    t.string "area"
    t.text "observations"
    t.integer "user_direction_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "last_user_edited_id"
    t.integer "user_id"
    t.float "anticipo"
  end

  create_table "material_invoices", force: :cascade do |t|
    t.integer "material_id"
    t.integer "user_id"
    t.string "number"
    t.float "value"
    t.text "observation"
    t.string "file"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "materials", force: :cascade do |t|
    t.integer "provider_id"
    t.date "sales_date"
    t.string "sales_number"
    t.float "amount"
    t.date "delivery_date"
    t.string "sales_state"
    t.text "description"
    t.string "provider_invoice_number"
    t.float "provider_invoice_value"
    t.integer "cost_center_id"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "update_user"
    t.integer "last_user_edited_id"
    t.index "EXTRACT(year FROM sales_date)", name: "index_materials_on_sales_date_year"
    t.index "EXTRACT(year FROM sales_date), EXTRACT(month FROM sales_date)", name: "index_materials_on_sales_date_year_month"
    t.index ["cost_center_id"], name: "index_materials_on_cost_center_id"
  end

  create_table "module_controls", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_module_controls_on_name"
  end

  create_table "notification_alerts", force: :cascade do |t|
    t.integer "user_id"
    t.boolean "state", default: false
    t.string "module"
    t.integer "cost_center_id"
    t.text "description"
    t.float "expected", default: 0.0
    t.float "real", default: 0.0
    t.date "date_update"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["cost_center_id"], name: "index_notification_alerts_on_cost_center_id"
  end

  create_table "parameterizations", force: :cascade do |t|
    t.string "name"
    t.integer "user_id"
    t.integer "number_value"
    t.integer "money_value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_parameterizations_on_created_at"
    t.index ["name"], name: "index_parameterizations_on_name"
  end

  create_table "providers", force: :cascade do |t|
    t.string "name"
    t.string "phone"
    t.string "address"
    t.string "nit"
    t.string "web"
    t.string "email"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_providers_on_created_at"
    t.index ["name"], name: "index_providers_on_name"
  end

  create_table "quotations", force: :cascade do |t|
    t.integer "cost_center_id"
    t.text "description"
    t.string "quotation_number"
    t.float "eng_hours"
    t.float "hour_real"
    t.float "hour_cotizada"
    t.float "hours_contractor"
    t.float "hours_contractor_real"
    t.float "hours_contractor_invoices"
    t.float "displacement_hours"
    t.float "value_displacement_hours"
    t.float "materials_value"
    t.float "viatic_value"
    t.float "quotation_value"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.float "ingenieria_total_costo"
    t.float "engineering_value"
    t.float "contractor_total_costo"
    t.float "work_force_contractor"
    t.float "offset_value"
    t.index ["cost_center_id"], name: "index_quotations_on_cost_center_id"
  end

  create_table "register_edits", force: :cascade do |t|
    t.integer "user_id"
    t.integer "register_user_id"
    t.string "state"
    t.date "date_update"
    t.json "editValues"
    t.json "newValues"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "module"
    t.text "description"
    t.string "type_edit", default: "edito"
  end

  create_table "report_expense_options", force: :cascade do |t|
    t.string "name"
    t.string "category"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "report_expenses", force: :cascade do |t|
    t.integer "user_id"
    t.integer "cost_center_id"
    t.integer "user_invoice_id"
    t.string "invoice_name"
    t.date "invoice_date"
    t.string "type_identification"
    t.text "description"
    t.string "invoice_number"
    t.string "invoice_type"
    t.string "payment_type"
    t.float "invoice_value", default: 0.0
    t.float "invoice_tax", default: 0.0
    t.float "invoice_total", default: 0.0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "type_identification_id"
    t.integer "payment_type_id"
    t.string "identification"
    t.integer "last_user_edited_id"
    t.boolean "is_acepted", default: false
    t.index ["cost_center_id"], name: "index_report_expenses_on_cost_center_id"
    t.index ["created_at"], name: "index_report_expenses_on_created_at"
    t.index ["invoice_date"], name: "index_report_expenses_on_invoice_date"
    t.index ["is_acepted"], name: "index_report_expenses_on_is_acepted"
    t.index ["payment_type_id"], name: "index_report_expenses_on_payment_type_id"
    t.index ["type_identification_id"], name: "index_report_expenses_on_type_identification_id"
    t.index ["user_invoice_id"], name: "index_report_expenses_on_user_invoice_id"
  end

  create_table "reports", force: :cascade do |t|
    t.date "report_date"
    t.integer "user_id"
    t.float "working_time"
    t.float "working_value"
    t.text "work_description"
    t.float "viatic_value"
    t.text "viatic_description"
    t.float "total_value"
    t.integer "cost_center_id"
    t.integer "report_execute_id"
    t.integer "report_code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "code_report"
    t.string "customer_name"
    t.string "contact_name"
    t.string "contact_email"
    t.string "contact_phone"
    t.string "contact_position"
    t.integer "customer_id"
    t.integer "contact_id"
    t.boolean "report_sate"
    t.integer "count"
    t.float "displacement_hours"
    t.float "value_displacement_hours"
    t.integer "update_user"
    t.integer "last_user_edited_id"
    t.index "EXTRACT(year FROM report_date)", name: "index_reports_on_report_date_year"
    t.index "EXTRACT(year FROM report_date), EXTRACT(month FROM report_date)", name: "index_reports_on_report_date_year_month"
    t.index ["contact_id"], name: "index_reports_on_contact_id"
    t.index ["cost_center_id"], name: "index_reports_on_cost_center_id"
    t.index ["customer_id"], name: "index_reports_on_customer_id"
    t.index ["last_user_edited_id"], name: "index_reports_on_last_user_edited_id"
    t.index ["report_date"], name: "index_reports_on_report_date"
    t.index ["report_execute_id"], name: "index_reports_on_report_execute_id"
    t.index ["report_sate"], name: "index_reports_on_report_sate"
    t.index ["user_id"], name: "index_reports_on_user_id"
  end

  create_table "rols", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["name"], name: "index_rols_on_name"
  end

  create_table "sales_orders", force: :cascade do |t|
    t.date "created_date"
    t.string "order_number"
    t.float "order_value"
    t.string "state"
    t.string "order_file"
    t.integer "cost_center_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.text "description"
    t.float "sum_invoices"
    t.integer "update_user"
    t.integer "last_user_edited_id"
    t.index ["cost_center_id"], name: "index_sales_orders_on_cost_center_id"
    t.index ["created_date"], name: "index_sales_orders_on_created_date"
    t.index ["last_user_edited_id"], name: "index_sales_orders_on_last_user_edited_id"
    t.index ["order_number"], name: "index_sales_orders_on_order_number"
    t.index ["user_id"], name: "index_sales_orders_on_user_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.string "session_id", null: false
    t.text "data"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["session_id"], name: "index_sessions_on_session_id", unique: true
    t.index ["updated_at"], name: "index_sessions_on_updated_at"
  end

  create_table "shifts", force: :cascade do |t|
    t.integer "user_id"
    t.integer "user_responsible_id"
    t.datetime "start_date"
    t.datetime "end_date"
    t.integer "cost_center_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "subject"
    t.text "description"
    t.string "color", default: "#1aa9fb"
    t.boolean "force_save", default: false
    t.string "microsoft_id"
    t.index ["cost_center_id"], name: "index_shifts_on_cost_center_id"
    t.index ["end_date"], name: "index_shifts_on_end_date"
    t.index ["start_date"], name: "index_shifts_on_start_date"
    t.index ["user_id"], name: "index_shifts_on_user_id"
    t.index ["user_responsible_id", "start_date", "end_date"], name: "index_shifts_on_user_dates"
    t.index ["user_responsible_id"], name: "index_shifts_on_user_responsible_id"
  end

  create_table "shifts_users", id: false, force: :cascade do |t|
    t.bigint "shift_id", null: false
    t.bigint "user_id", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "names"
    t.string "last_names"
    t.date "birthday"
    t.string "avatar"
    t.integer "rol_id"
    t.string "document_type"
    t.integer "number_document"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "rol_user"
    t.string "menu", default: "nav-sm"
    t.integer "actual_user"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["rol_id"], name: "index_users_on_rol_id"
  end

end
