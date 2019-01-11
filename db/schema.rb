# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2019_01_11_212537) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "contacts", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.integer "phone"
    t.integer "provider_id"
    t.string "position"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
  end

  create_table "customer_reports_reports", id: false, force: :cascade do |t|
    t.bigint "customer_report_id", null: false
    t.bigint "report_id", null: false
  end

  create_table "customers", force: :cascade do |t|
    t.string "client"
    t.string "name"
    t.integer "phone"
    t.string "address"
    t.integer "nit"
    t.string "web"
    t.string "email"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "parameterizations", force: :cascade do |t|
    t.string "name"
    t.integer "user_id"
    t.integer "number_value"
    t.integer "money_value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "providers", force: :cascade do |t|
    t.string "name"
    t.integer "phone"
    t.string "address"
    t.integer "nit"
    t.string "web"
    t.string "email"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "reports", force: :cascade do |t|
    t.date "report_date"
    t.integer "user_id"
    t.integer "working_time"
    t.text "work_description"
    t.integer "viatic_value"
    t.text "viatic_description"
    t.integer "total_value"
    t.integer "cost_center_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "report_code"
  end

  create_table "rols", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

end
