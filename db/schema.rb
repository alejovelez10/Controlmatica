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

ActiveRecord::Schema.define(version: 2026_10_22_000001) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
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
    t.index ["user_id"], name: "index_commissions_on_user_id"
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
    t.index ["user_id"], name: "index_contractors_on_user_id"
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
    t.index ["user_id"], name: "index_customer_reports_on_user_id"
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

  create_table "documentation_files", force: :cascade do |t|
    t.bigint "documentation_module_id", null: false
    t.string "file", null: false
    t.string "name", null: false
    t.string "content_type"
    t.bigint "byte_size"
    t.integer "user_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["documentation_module_id"], name: "index_documentation_files_on_documentation_module_id"
  end

  create_table "documentation_modules", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.integer "user_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index "lower((name)::text)", name: "index_documentation_modules_on_lower_name", unique: true
  end

  create_table "exchange_rates", force: :cascade do |t|
    t.string "currency", null: false
    t.date "rate_date", null: false
    t.date "effective_date", null: false
    t.decimal "rate_to_cop", precision: 18, scale: 6, null: false
    t.string "source", null: false
    t.datetime "fetched_at", null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["currency", "effective_date"], name: "index_exchange_rates_on_currency_and_effective_date"
    t.index ["currency", "rate_date"], name: "index_exchange_rates_on_currency_and_rate_date", unique: true
  end

  create_table "expense_budgets", force: :cascade do |t|
    t.integer "cost_center_id", null: false
    t.integer "user_id", null: false
    t.decimal "amount", precision: 15, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.boolean "active", default: true, null: false
    t.integer "created_by_id"
    t.integer "last_user_edited_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["cost_center_id", "user_id", "active"], name: "index_expense_budgets_on_center_user_active"
    t.index ["cost_center_id"], name: "index_expense_budgets_on_cost_center_id"
    t.index ["user_id"], name: "index_expense_budgets_on_user_id"
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
    t.index ["user_id"], name: "index_expense_ratios_on_user_id"
  end

  create_table "expense_rules", force: :cascade do |t|
    t.string "name", null: false
    t.boolean "active", default: true, null: false
    t.boolean "is_default", default: false, null: false
    t.integer "max_invoice_age_days"
    t.decimal "max_invoice_value", precision: 15, scale: 2
    t.boolean "check_duplicates", default: true, null: false
    t.text "agent_instructions"
    t.integer "user_id"
    t.integer "last_user_edited_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.boolean "mandatory", default: true, null: false
    t.boolean "applies_to_all_roles", default: false, null: false
    t.boolean "prohibits_expense", default: false, null: false
    t.text "observations"
    t.boolean "requires_second_approval", default: false, null: false
    t.integer "second_approver_rol_id"
    t.integer "second_approver_user_id"
    t.index ["active"], name: "index_expense_rules_on_active"
    t.index ["is_default"], name: "index_expense_rules_on_is_default"
    t.index ["is_default"], name: "index_expense_rules_unique_default_active", unique: true, where: "(is_default AND active)"
  end

  create_table "expense_rules_excluded_rols", id: false, force: :cascade do |t|
    t.bigint "expense_rule_id", null: false
    t.bigint "rol_id", null: false
    t.index ["expense_rule_id", "rol_id"], name: "index_expense_rules_excluded_rols_unique", unique: true
    t.index ["rol_id"], name: "index_expense_rules_excluded_rols_on_rol_id"
  end

  create_table "expense_rules_excluded_types", id: false, force: :cascade do |t|
    t.bigint "expense_rule_id", null: false
    t.bigint "report_expense_option_id", null: false
    t.index ["expense_rule_id", "report_expense_option_id"], name: "index_expense_rules_excluded_types_unique", unique: true
    t.index ["report_expense_option_id"], name: "index_expense_rules_excluded_types_on_report_expense_option_id"
  end

  create_table "expense_rules_excluded_users", id: false, force: :cascade do |t|
    t.bigint "expense_rule_id", null: false
    t.bigint "user_id", null: false
    t.index ["expense_rule_id", "user_id"], name: "index_expense_rules_excluded_users_unique", unique: true
    t.index ["user_id"], name: "index_expense_rules_excluded_users_on_user_id"
  end

  create_table "expense_rules_included_types", id: false, force: :cascade do |t|
    t.bigint "expense_rule_id", null: false
    t.bigint "report_expense_option_id", null: false
    t.index ["expense_rule_id", "report_expense_option_id"], name: "index_expense_rules_included_types_unique", unique: true
    t.index ["report_expense_option_id"], name: "index_expense_rules_included_types_on_report_expense_option_id"
  end

  create_table "expense_rules_rols", id: false, force: :cascade do |t|
    t.bigint "expense_rule_id", null: false
    t.bigint "rol_id", null: false
    t.index ["expense_rule_id", "rol_id"], name: "index_expense_rules_rols_unique", unique: true
    t.index ["expense_rule_id"], name: "index_expense_rules_rols_on_expense_rule_id"
    t.index ["rol_id"], name: "index_expense_rules_rols_on_rol_id"
  end

  create_table "good_job_batches", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.text "description"
    t.jsonb "serialized_properties"
    t.text "on_finish"
    t.text "on_success"
    t.text "on_discard"
    t.text "callback_queue_name"
    t.integer "callback_priority"
    t.datetime "enqueued_at"
    t.datetime "discarded_at"
    t.datetime "finished_at"
    t.datetime "jobs_finished_at"
    t.index ["created_at", "id"], name: "index_good_job_batches_on_created_at_and_id", order: :desc
    t.index ["finished_at"], name: "index_good_job_batches_on_finished_at", where: "(finished_at IS NOT NULL)"
  end

  create_table "good_job_concurrency_claims", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "job_id", null: false
    t.uuid "locked_by_id"
    t.integer "state", limit: 2, null: false
    t.text "key", null: false
    t.index ["job_id"], name: "index_good_job_concurrency_claims_on_job_id"
    t.index ["key", "job_id"], name: "index_good_job_concurrency_claims_on_key_and_job_id", unique: true
    t.index ["key", "state", "created_at"], name: "index_good_job_concurrency_claims_for_promotion"
    t.index ["locked_by_id"], name: "index_good_job_concurrency_claims_on_locked_by_id", where: "(locked_by_id IS NOT NULL)"
  end

  create_table "good_job_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.uuid "active_job_id", null: false
    t.text "job_class"
    t.text "queue_name"
    t.jsonb "serialized_params"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.text "error"
    t.integer "error_event", limit: 2
    t.text "error_backtrace", array: true
    t.uuid "process_id"
    t.interval "duration"
    t.index ["active_job_id", "created_at"], name: "index_good_job_executions_on_active_job_id_and_created_at"
    t.index ["process_id", "created_at"], name: "index_good_job_executions_on_process_id_and_created_at"
    t.index ["scheduled_at"], name: "index_good_job_executions_on_scheduled_at"
  end

  create_table "good_job_processes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.jsonb "state"
    t.integer "lock_type", limit: 2
  end

  create_table "good_job_settings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.text "key"
    t.jsonb "value"
    t.index ["key"], name: "index_good_job_settings_on_key", unique: true
  end

  create_table "good_jobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "queue_name"
    t.integer "priority"
    t.jsonb "serialized_params"
    t.datetime "scheduled_at"
    t.datetime "performed_at"
    t.datetime "finished_at"
    t.text "error"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.uuid "active_job_id"
    t.text "concurrency_key"
    t.text "cron_key"
    t.uuid "retried_good_job_id"
    t.datetime "cron_at"
    t.uuid "batch_id"
    t.uuid "batch_callback_id"
    t.boolean "is_discrete"
    t.integer "executions_count"
    t.text "job_class"
    t.integer "error_event", limit: 2
    t.text "labels", array: true
    t.uuid "locked_by_id"
    t.datetime "locked_at"
    t.integer "lock_type", limit: 2
    t.index ["active_job_id", "created_at"], name: "index_good_jobs_on_active_job_id_and_created_at"
    t.index ["batch_callback_id"], name: "index_good_jobs_on_batch_callback_id", where: "(batch_callback_id IS NOT NULL)"
    t.index ["batch_callback_id"], name: "index_good_jobs_on_batch_callback_id_unfinished", where: "((batch_callback_id IS NOT NULL) AND (finished_at IS NULL))"
    t.index ["batch_id"], name: "index_good_jobs_on_batch_id", where: "(batch_id IS NOT NULL)"
    t.index ["batch_id"], name: "index_good_jobs_on_batch_id_unfinished", where: "((batch_id IS NOT NULL) AND (finished_at IS NULL))"
    t.index ["concurrency_key", "created_at"], name: "index_good_jobs_on_concurrency_key_and_created_at"
    t.index ["concurrency_key"], name: "index_good_jobs_on_concurrency_key_when_unfinished", where: "(finished_at IS NULL)"
    t.index ["created_at"], name: "index_good_jobs_on_created_at"
    t.index ["cron_key", "created_at"], name: "index_good_jobs_on_cron_key_and_created_at_cond", where: "(cron_key IS NOT NULL)"
    t.index ["cron_key", "cron_at"], name: "index_good_jobs_on_cron_key_and_cron_at_cond", unique: true, order: { cron_at: "DESC NULLS LAST" }, where: "(cron_key IS NOT NULL)"
    t.index ["finished_at"], name: "index_good_jobs_jobs_on_finished_at_only", where: "(finished_at IS NOT NULL)"
    t.index ["finished_at"], name: "index_good_jobs_on_discarded", order: :desc, where: "((finished_at IS NOT NULL) AND (error IS NOT NULL))"
    t.index ["id"], name: "index_good_jobs_on_unfinished_or_errored", where: "((finished_at IS NULL) OR (error IS NOT NULL))"
    t.index ["job_class", "finished_at"], name: "index_good_jobs_on_discarded_job_class", where: "((finished_at IS NOT NULL) AND (error IS NOT NULL))"
    t.index ["job_class"], name: "index_good_jobs_on_job_class"
    t.index ["labels"], name: "index_good_jobs_on_labels", where: "(labels IS NOT NULL)", using: :gin
    t.index ["locked_by_id"], name: "index_good_jobs_on_locked_by_id", where: "(locked_by_id IS NOT NULL)"
    t.index ["priority", "created_at"], name: "index_good_job_jobs_for_candidate_lookup", where: "(finished_at IS NULL)"
    t.index ["priority", "scheduled_at", "id"], name: "index_good_jobs_for_candidate_dequeue_unlocked", where: "((finished_at IS NULL) AND (locked_by_id IS NULL))"
    t.index ["priority", "scheduled_at", "id"], name: "index_good_jobs_on_priority_scheduled_at_unfinished", where: "(finished_at IS NULL)"
    t.index ["queue_name", "priority", "created_at"], name: "index_good_jobs_dequeue_by_queue", where: "((finished_at IS NULL) AND (locked_by_id IS NULL))"
    t.index ["queue_name", "priority", "scheduled_at"], name: "index_good_jobs_dequeue_by_queue_scheduled_at", where: "((finished_at IS NULL) AND (locked_by_id IS NULL))"
    t.index ["queue_name", "scheduled_at", "id"], name: "index_good_jobs_on_queue_name_priority_scheduled_at_unfinished", where: "(finished_at IS NULL)"
    t.index ["queue_name"], name: "index_good_jobs_on_queue_name"
    t.index ["scheduled_at", "queue_name"], name: "index_good_jobs_on_scheduled_at_and_queue_name"
    t.index ["scheduled_at"], name: "index_good_jobs_on_scheduled_at", where: "(finished_at IS NULL)"
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
    t.index ["user_id"], name: "index_materials_on_user_id"
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
    t.index ["state", "date_update"], name: "index_notification_alerts_on_state_and_date_update", order: { date_update: :desc }
    t.index ["state"], name: "index_notification_alerts_on_state"
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
    t.index ["state", "created_at"], name: "index_register_edits_on_state_and_created_at", order: { created_at: :desc }
    t.index ["state"], name: "index_register_edits_on_state"
  end

  create_table "report_expense_options", force: :cascade do |t|
    t.string "name"
    t.string "category"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "used_by_ai", default: true, null: false
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
    t.integer "expense_budget_id"
    t.string "budget_status", default: "sin_presupuesto", null: false
    t.string "budget_reason"
    t.string "receipt_file"
    t.string "currency", default: "COP", null: false
    t.decimal "foreign_value", precision: 15, scale: 2
    t.decimal "foreign_tax", precision: 15, scale: 2
    t.decimal "foreign_total", precision: 15, scale: 2
    t.decimal "exchange_rate", precision: 18, scale: 6
    t.date "exchange_rate_date"
    t.string "exchange_rate_source"
    t.boolean "accounting_approved", default: false, null: false
    t.integer "accounting_approved_by_id"
    t.datetime "accounting_approved_at"
    t.jsonb "rule_violations", default: [], null: false
    t.text "observations"
    t.string "operational_state", default: "creado", null: false
    t.datetime "rejected_at"
    t.integer "rejected_by_id"
    t.text "rejection_reason"
    t.jsonb "second_approval_rules", default: [], null: false
    t.integer "first_approved_by_id"
    t.datetime "first_approved_at"
    t.integer "second_approved_by_id"
    t.datetime "second_approved_at"
    t.index ["accounting_approved", "invoice_date"], name: "index_report_expenses_on_accounting_approved_and_date"
    t.index ["budget_status"], name: "index_report_expenses_on_budget_status"
    t.index ["cost_center_id"], name: "index_report_expenses_on_cost_center_id"
    t.index ["created_at"], name: "index_report_expenses_on_created_at"
    t.index ["currency"], name: "index_report_expenses_on_foreign_currency", where: "((currency)::text <> 'COP'::text)"
    t.index ["expense_budget_id"], name: "index_report_expenses_on_expense_budget_id"
    t.index ["invoice_date"], name: "index_report_expenses_on_invoice_date"
    t.index ["invoice_number", "identification"], name: "index_report_expenses_on_invoice_number_and_identification"
    t.index ["is_acepted"], name: "index_report_expenses_on_is_acepted"
    t.index ["operational_state"], name: "index_report_expenses_on_operational_state"
    t.index ["payment_type_id"], name: "index_report_expenses_on_payment_type_id"
    t.index ["type_identification_id"], name: "index_report_expenses_on_type_identification_id"
    t.index ["user_id"], name: "index_report_expenses_on_user_id"
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
    t.string "phone"
    t.string "phone_normalized"
    t.string "whatsapp_user_id"
    t.string "whatsapp_username"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["phone_normalized"], name: "index_users_on_phone_normalized"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["rol_id"], name: "index_users_on_rol_id"
    t.index ["whatsapp_user_id"], name: "index_users_on_whatsapp_user_id"
    t.index ["whatsapp_username"], name: "index_users_on_whatsapp_username", unique: true, where: "(whatsapp_username IS NOT NULL)"
  end

  create_table "whatsapp_conversations", force: :cascade do |t|
    t.bigint "user_id"
    t.string "wa_id"
    t.string "bsuid"
    t.string "flujo"
    t.string "prompt_version"
    t.jsonb "messages", default: [], null: false
    t.jsonb "estado", default: {}, null: false
    t.datetime "last_inbound_at"
    t.datetime "closed_at"
    t.string "closed_reason"
    t.integer "input_tokens", default: 0, null: false
    t.integer "output_tokens", default: 0, null: false
    t.integer "cache_read_tokens", default: 0, null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["bsuid", "closed_at"], name: "index_whatsapp_conversations_on_bsuid_and_closed_at"
    t.index ["user_id"], name: "index_whatsapp_conversations_on_user_id"
    t.index ["wa_id", "closed_at"], name: "index_whatsapp_conversations_on_wa_id_and_closed_at"
  end

  create_table "whatsapp_messages", force: :cascade do |t|
    t.string "wamid", null: false
    t.string "direction", null: false
    t.bigint "user_id"
    t.bigint "whatsapp_conversation_id"
    t.string "wa_id"
    t.string "bsuid"
    t.string "message_type"
    t.text "body"
    t.string "media_id"
    t.string "media_mime"
    t.string "media_filename"
    t.string "media_file"
    t.jsonb "payload", default: {}, null: false
    t.string "status", default: "recibido", null: false
    t.text "error"
    t.datetime "processed_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "username"
    t.index ["user_id"], name: "index_whatsapp_messages_on_user_id"
    t.index ["wa_id", "created_at"], name: "index_whatsapp_messages_on_wa_id_and_created_at"
    t.index ["wamid"], name: "index_whatsapp_messages_on_wamid", unique: true
    t.index ["whatsapp_conversation_id"], name: "index_whatsapp_messages_on_whatsapp_conversation_id"
  end

  add_foreign_key "documentation_files", "documentation_modules"
  add_foreign_key "expense_rules_excluded_rols", "expense_rules", on_delete: :cascade
  add_foreign_key "expense_rules_excluded_rols", "rols", on_delete: :cascade
  add_foreign_key "expense_rules_excluded_types", "expense_rules", on_delete: :cascade
  add_foreign_key "expense_rules_excluded_types", "report_expense_options", on_delete: :cascade
  add_foreign_key "expense_rules_excluded_users", "expense_rules", on_delete: :cascade
  add_foreign_key "expense_rules_excluded_users", "users", on_delete: :cascade
  add_foreign_key "expense_rules_included_types", "expense_rules", on_delete: :cascade
  add_foreign_key "expense_rules_included_types", "report_expense_options", on_delete: :cascade
  add_foreign_key "expense_rules_rols", "expense_rules"
  add_foreign_key "expense_rules_rols", "rols"
  add_foreign_key "whatsapp_conversations", "users"
  add_foreign_key "whatsapp_messages", "users"
  add_foreign_key "whatsapp_messages", "whatsapp_conversations"
end
