# == Schema Information
#
# Table name: expense_budgets
#
#  id                  :bigint           not null, primary key
#  active              :boolean          default(TRUE), not null
#  amount              :decimal(15, 2)   default(0.0), not null
#  notes               :text
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer          not null
#  created_by_id       :integer
#  last_user_edited_id :integer
#  user_id             :integer          not null
#
# Indexes
#
#  index_expense_budgets_on_center_user_active  (cost_center_id,user_id,active)
#  index_expense_budgets_on_cost_center_id      (cost_center_id)
#  index_expense_budgets_on_user_id             (user_id)
#
require "test_helper"

# Forma del JSON de una partida (contrato A.2 de 00-ARQUITECTURA.md).
#
# POR QUE SE PRUEBA EL SERIALIZER Y NO SOLO EL ENDPOINT: la ausencia de queries
# dentro del serializer es una propiedad DEL SERIALIZER. Probarla via HTTP obliga
# a montar un centro, un rol, permisos y una sesion, y el conteo de consultas
# queda contaminado por las del login y las de permisos.
class ExpenseBudgetSerializerTest < ActiveSupport::TestCase
  setup do
    @budget = expense_budgets(:activa_ingeniero)
  end

  def serializar(objeto)
    ActiveModelSerializers::SerializableResource.new(objeto, serializer: ExpenseBudgetSerializer).as_json
  end

  # Cuenta las consultas SQL reales del bloque, ignorando las de esquema y las de
  # transaccion, que no dependen del codigo bajo prueba.
  def contar_queries
    consultas = []
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |_n, _s, _f, _i, payload|
      consultas << payload[:sql] unless %w[SCHEMA TRANSACTION].include?(payload[:name])
    end
    yield
    consultas
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber)
  end

  test "expone las claves del contrato A.2" do
    hash = serializar(@budget)

    esperadas = %i[id cost_center_id user_id amount notes active spent available
                   created_at updated_at user created_by last_user_edited].sort

    assert_equal esperadas, hash.keys.sort
  end

  test "spent y available salen del precargado y no consultan" do
    # El precargado real lo hace ExpenseBudgetsController#preload_amounts!; aqui
    # se simula inyectando los dos valores, que es exactamente lo que el
    # controller hace en lote.
    @budget.spent_amount = BigDecimal("123.45")
    @budget.available_amount = BigDecimal("376.55")

    # Las tres asociaciones a users se tocan ANTES de contar: lo que este test
    # vigila es que `spent` y `available` no disparen los dos SUM del modelo, no
    # el preload de asociaciones (de eso se encarga el `includes` del controller).
    @budget.user
    @budget.created_by
    @budget.last_user_edited

    hash = nil
    consultas = contar_queries { hash = serializar(@budget) }

    assert_equal [], consultas,
                 "El serializer ejecuto SQL: #{consultas.inspect}. `spent`/`available` deben venir precargados."
    assert_equal "123.45", hash[:spent].to_s
    assert_equal "376.55", hash[:available].to_s
  end

  test "user created_by y last_user_edited usan UserSerializer" do
    budget = expense_budgets(:activa_ingeniero)
    as_user(users(:admin)) { budget.update!(notes: "toco last_user_edited") }

    hash = serializar(budget.reload)

    # UserSerializer expone id, names y phone (phone lo agrego el trabajo de
    # WhatsApp que ya estaba en la rama; el contrato del documento solo pedia id
    # y names, y esas dos siguen ahi).
    claves = %i[id names phone].sort
    assert_equal claves, hash[:user].keys.sort
    assert_equal claves, hash[:created_by].keys.sort
    assert_equal claves, hash[:last_user_edited].keys.sort

    assert_equal users(:ingeniero).id, hash[:user][:id]
    assert_equal users(:admin).id, hash[:created_by][:id]
  end

  test "last_user_edited nil no revienta" do
    budget = nil
    as_user(users(:admin)) do
      budget = ExpenseBudget.create!(cost_center: cost_centers(:centro_con_viaticos),
                                     user: users(:ingeniero_dos), amount: 50_000,
                                     created_by: users(:admin))
    end

    assert_nil budget.last_user_edited_id, "La partida recien creada no deberia tener editor"
    assert_nil serializar(budget)[:last_user_edited]
  end

  test "amount spent y available se serializan como string y no como float" do
    @budget.spent_amount = BigDecimal("100000.50")
    @budget.available_amount = BigDecimal("399999.50")
    hash = serializar(@budget)

    # BigDecimal -> String en el JSON. El frontend hace parseFloat; convertirlos
    # a float aqui perderia centavos en montos grandes.
    assert_kind_of String, hash[:amount].to_s
    assert_equal "500000.0", hash[:amount].to_s
    assert_equal "100000.5", hash[:spent].to_s
  end
end
