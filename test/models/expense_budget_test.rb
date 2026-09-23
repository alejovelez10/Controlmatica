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

# Validaciones, scopes y regla de tope de ExpenseBudget.
#
# El tope se prueba AQUI y no solo en el servicio a proposito: la regla vive en
# el modelo para que un `create!` desde consola, seed o rake tampoco pueda
# superar el valor de viaticos del centro. El servicio aporta el lock, no la
# regla.
class ExpenseBudgetTest < ActiveSupport::TestCase
  setup do
    @admin       = users(:admin)
    @ingeniero   = users(:ingeniero)
    @centro      = cost_centers(:centro_con_viaticos)   # viatic_value 5.000.000
    @centro_sin  = cost_centers(:centro_sin_viaticos)   # viatic_value nil
    @centro_solo = cost_centers(:centro_ajeno)          # viatic_value 1.000.000, sin partidas
  end

  # Centro limpio con el tope que pida el test, cambiado SOLO EN MEMORIA.
  #
  # No se hace `update_column`: escribir en `cost_centers` deja tuplas muertas,
  # el autovacuum analiza la tabla de forma asincrona y el planificador puede
  # pasar de seq scan a index scan. Eso cambia el orden de los `where(id: [...])`
  # sin ORDER BY que hay en los golden de auditoria del paquete 03 (que dependen
  # del orden de la consulta a proposito) y los pone a fallar de forma
  # intermitente, con el mismo seed. La regla del tope solo LEE viatic_value, asi
  # que el cambio en memoria alcanza y la tabla no se toca.
  def centro_con_tope(valor)
    @centro_solo.viatic_value = valor
    @centro_solo
  end

  def nueva_partida(**overrides)
    ExpenseBudget.new({ cost_center: @centro, user: @ingeniero, amount: 1000,
                        created_by_id: @admin.id }.merge(overrides))
  end

  # --- Validaciones ---------------------------------------------------------

  def test_requiere_cost_center
    partida = ExpenseBudget.new(user: @ingeniero, amount: 1)

    assert_not partida.valid?
    # TRAMPA: en Rails 6.1 un belongs_to requerido produce el error en
    # :cost_center, NO en :cost_center_id. Afirmar sobre la clave _id pasa vacio
    # y da falso verde.
    assert_includes partida.errors.attribute_names, :cost_center
  end

  def test_requiere_user_beneficiario
    partida = ExpenseBudget.new(cost_center: @centro, amount: 1)

    assert_not partida.valid?
    assert_includes partida.errors.attribute_names, :user
  end

  def test_requiere_amount
    partida = nueva_partida(amount: nil)

    assert_not partida.valid?
    assert_includes partida.errors.attribute_names, :amount
  end

  def test_amount_cero_es_invalido
    partida = nueva_partida(amount: 0)

    assert_not partida.valid?
    assert_includes partida.errors[:amount], "must be greater than 0"
  end

  def test_amount_negativo_es_invalido
    partida = nueva_partida(amount: -1)

    assert_not partida.valid?
    assert_includes partida.errors.attribute_names, :amount
  end

  def test_active_por_defecto_true
    # Sale del default de la columna, que entrega el paquete 02.
    assert_equal true, ExpenseBudget.new.active

    # Criterio 24 del paquete: los attr_writer de montos existen. Sin ellos el
    # `preload_amounts!` del controller del paquete 07 revienta con
    # NoMethodError y la tabla de partidas cae en N+1.
    assert_respond_to ExpenseBudget.new, :spent_amount=
    assert_respond_to ExpenseBudget.new, :available_amount=
  end

  def test_notes_opcional
    assert_predicate nueva_partida(notes: nil), :valid?
  end

  def test_notes_supera_1000_caracteres
    partida = nueva_partida(notes: "x" * 1001)

    assert_not partida.valid?
    assert_includes partida.errors.attribute_names, :notes
  end

  # --- Scopes ---------------------------------------------------------------

  def test_scope_activas_excluye_inactivas
    assert_not_includes ExpenseBudget.activas, expense_budgets(:inactiva_ingeniero)
    assert_includes ExpenseBudget.activas, expense_budgets(:activa_ingeniero)
  end

  def test_scope_para_filtra_por_centro_y_usuario
    # Las tres partidas del par (dos activas y una inactiva). La del contador en
    # el mismo centro y la del centro sin viaticos quedan fuera.
    assert_equal 3, ExpenseBudget.para(@centro.id, @ingeniero.id).count
  end

  def test_scope_antiguas_primero_ordena_por_created_at
    assert_equal expense_budgets(:activa_ingeniero),
                 ExpenseBudget.para(@centro.id, @ingeniero.id).activas.antiguas_primero.first
  end

  # --- Tope contra cost_centers.viatic_value --------------------------------

  def test_tope_cabe_justo
    centro = centro_con_tope(1_000_000)
    as_user(@admin) { ExpenseBudget.create!(cost_center: centro, user: @ingeniero, amount: 600_000) }

    assert_predicate nueva_partida(cost_center: centro, amount: 400_000), :valid?
  end

  def test_tope_se_pasa_por_un_peso
    centro = centro_con_tope(1_000_000)
    as_user(@admin) { ExpenseBudget.create!(cost_center: centro, user: @ingeniero, amount: 600_000) }

    assert_not nueva_partida(cost_center: centro, amount: 400_001).valid?
  end

  def test_tope_mensaje_exacto
    centro = centro_con_tope(1_000_000)
    as_user(@admin) { ExpenseBudget.create!(cost_center: centro, user: @ingeniero, amount: 600_000) }

    partida = nueva_partida(cost_center: centro, amount: 400_001)
    partida.valid?

    # Este string sale a pantalla y lo busca el E2E del paquete 12. Cambiarlo
    # aqui es cambiarlo en todas partes; no se duplica en el frontend.
    assert_equal "La suma de las partidas ($1.000.001) supera el valor de viáticos del centro de " \
                 "costos ($1.000.000). Disponible para asignar: $400.000",
                 partida.errors[:amount].first
  end

  def test_tope_viatic_value_nil
    partida = nueva_partida(cost_center: @centro_sin, amount: 1000)

    assert_not partida.valid?
    assert_equal "El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas",
                 partida.errors[:amount].first
  end

  def test_tope_viatic_value_cero
    centro = centro_con_tope(0)
    partida = nueva_partida(cost_center: centro, amount: 1000)

    assert_not partida.valid?
    assert_equal "El centro de costos no tiene valor de viáticos cotizado; no es posible asignar partidas",
                 partida.errors[:amount].first
  end

  def test_tope_excluye_la_propia_partida_al_editar
    # Partida que llena EXACTAMENTE el tope del centro (1.000.000).
    partida = as_user(@admin) do
      ExpenseBudget.create!(cost_center: @centro_solo, user: @ingeniero, amount: 1_000_000)
    end

    # Sin el exclude_id, la partida se contaria contra si misma y hasta un
    # guardado sin cambios seria invalido.
    partida.amount = 1_000_000
    assert_predicate partida, :valid?

    partida.amount = 999_999
    assert_predicate partida, :valid?

    partida.amount = 1_000_001
    assert_not partida.valid?
  end

  def test_tope_ignora_partidas_inactivas
    # Los gastos de las fixtures nacen SIN aceptar y desde el 2026-09-22 eso
    # reserva cupo (200.000 aqui). Se aceptan para dejar el tope entero y medir
    # unicamente lo que este test mide: que la partida inactiva no cuenta.
    ReportExpense.where(cost_center_id: @centro.id).update_all(is_acepted: true)

    # El centro tiene 1.000.000 en partidas ACTIVAS y 900.000 en una inactiva
    # sobre un tope de 5.000.000. Si la inactiva contara, esta partida de
    # 4.000.000 se pasaria por 900.000.
    assert_predicate nueva_partida(amount: 4_000_000), :valid?
  end

  # La cara opuesta del test anterior: con los gastos sin aceptar tal como
  # vienen, esos mismos 4.000.000 ya no caben.
  def test_tope_reserva_los_gastos_sin_aceptar
    assert_not nueva_partida(amount: 4_000_000).valid?
    assert_predicate nueva_partida(amount: 3_800_000), :valid?
  end

  def test_tope_suma_partidas_de_otros_usuarios_del_mismo_centro
    # EL TOPE ES POR CENTRO, NO POR PAR: los 300.000 del contador le bajan el
    # cupo disponible tambien al ingeniero.
    partida = nueva_partida(amount: 4_100_000)
    assert_not partida.valid?

    # Y la demostracion de que son esos 300.000 los que sobran: sin ellos, el
    # mismo monto cabe.
    as_user(@admin) { expense_budgets(:activa_otro_usuario).update!(active: false) }
    assert_predicate nueva_partida(amount: 4_100_000), :valid?
  end

  def test_desactivar_partida_en_centro_sin_viaticos_es_valido
    # CASO BORDE: desactivar o anular una partida nunca puede fallar por tope,
    # ni siquiera en un centro que jamas debio tener partidas.
    partida = expense_budgets(:centro_sin_viaticos)
    partida.active = false

    assert_predicate partida, :valid?
  end

  def test_destruir_partida_deja_expense_budget_id_nulo
    partida = expense_budgets(:activa_ingeniero)
    gasto = report_expenses(:one)
    gasto.update_columns(expense_budget_id: partida.id)

    as_user(@admin) { partida.destroy }

    assert_nil gasto.reload.expense_budget_id
    assert_predicate gasto.reload, :persisted?
  end
end
