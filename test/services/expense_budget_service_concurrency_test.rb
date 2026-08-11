require "test_helper"

# El bloqueo, probado contra Postgres de verdad y con hilos de verdad.
#
# POR QUE `use_transactional_tests = false`: por defecto Minitest envuelve cada
# test en una transaccion que nunca se commitea. Un segundo hilo usa OTRA
# conexion y por tanto NO VE nada de lo que creo el test. Cualquier prueba de
# concurrencia dentro de la transaccion de test estaria midiendo otra cosa.
# Precio: hay que limpiar a mano, con `delete_all` y no `destroy_all` (sin
# callbacks, sin User.current, sin RegisterEdit).
#
# ESTE ES EL UNICO ARCHIVO DE LA SUITE CON use_transactional_tests = false. No
# propagar el patron: hace la suite mas lenta y mas fragil.
#
# HONESTIDAD SOBRE QUE PRUEBA CADA UNO (leer antes de confiar en el verde):
#
#   * `test_el_lock_bloquea_a_una_segunda_conexion` es EL TEST QUE IMPORTA. Es
#     determinista: demuestra que el FOR UPDATE cae sobre la fila correcta de
#     `cost_centers` y que efectivamente bloquea a otra conexion. No depende de
#     ninguna carrera.
#   * `test_dos_gastos_simultaneos...` y `test_dos_partidas_simultaneas...` son
#     CORROBORATIVOS, NO PROBATORIOS. Aun con la barrera de arranque, el
#     planificador del sistema operativo puede correr los dos hilos en serie, y
#     entonces PASAN IGUAL aunque se borre el `FOR UPDATE` del servicio. Por eso
#     se repiten en un bucle, y por eso NO son los que defienden el invariante.
#   * Quien defiende el invariante es el par
#     `test_el_lock_bloquea_a_una_segunda_conexion` (existe el lock y esta sobre
#     la fila correcta) mas los dos
#     `..._emite_select_for_update_...` de expense_budget_service_cap_test.rb
#     (el camino de escritura lo toma). Si alguien borra el lock, esos tres
#     fallan SIEMPRE; el de los dos hilos falla solo a veces.
#   * NO se prueba el nivel de aislamiento de Postgres. Se asume READ COMMITTED,
#     que es el default y que este proyecto no cambia. Con SERIALIZABLE habria
#     que rescatar ActiveRecord::SerializationFailure.
class ExpenseBudgetServiceConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false

  # 300 ms en vez de los 5 s de produccion: el test SABE que el lock esta tomado
  # y no tiene nada que esperar.
  TIMEOUT_CORTO_MS = 300

  setup do
    limpiar
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero_dos)
    @centro    = cost_centers(:centro_ajeno)   # viatic_value 1.000.000
  end

  teardown do
    limpiar
  end

  # --- El test determinista, el que defiende el invariante ------------------

  def test_el_lock_bloquea_a_una_segunda_conexion
    tomado = Queue.new
    soltar = Queue.new

    hilo = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          CostCenter.lock.find(@centro.id)
          tomado << :si
          soltar.pop
        end
      end
    end

    tomado.pop   # No se sigue hasta que el otro hilo TIENE el lock.

    ActiveRecord::Base.transaction do
      ActiveRecord::Base.connection.execute("SET LOCAL lock_timeout = '#{TIMEOUT_CORTO_MS}ms'")

      # Si el FOR UPDATE no cayera sobre la fila de cost_centers, este find
      # devolveria el centro sin esperar y el test fallaria.
      assert_raises(ActiveRecord::LockWaitTimeout) { CostCenter.lock.find(@centro.id) }

      raise ActiveRecord::Rollback
    end
  ensure
    soltar << :ya
    hilo&.join
  end

  # --- Corroborativos: dos escritores reales contra el mismo tope -----------

  def test_dos_gastos_simultaneos_no_superan_el_tope
    10.times do
      limpiar
      partida = crear_partida(100_000)

      en_paralelo(2) { crear_gasto(60_000) }

      aprobados = ReportExpense.presupuesto_aprobado.count
      excedidos = ReportExpense.presupuesto_excedido.count

      assert_equal 2, aprobados + excedidos, "los dos gastos tienen que quedar guardados"
      # El invariante de negocio: la plata aprobada nunca pasa del cupo.
      assert_equal 1, aprobados
      assert_equal 1, excedidos
      assert_operator ReportExpense.presupuesto_aprobado.sum(:invoice_value), :<=, 100_000
      assert_predicate partida.reload, :persisted?
    end
  end

  def test_dos_partidas_simultaneas_no_superan_viatic_value
    10.times do
      limpiar

      resultados = en_paralelo(2) do
        ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                            amount: 600_000, actor: @admin)
      end

      # 600.000 + 600.000 = 1.200.000 contra un viatic_value de 1.000.000: una
      # de las dos TIENE que ser rechazada por el tope.
      assert_equal 1, resultados.count(&:ok?)
      assert_equal 1, resultados.count(&:error?)
      assert_operator ExpenseBudget.activas.where(cost_center_id: @centro.id).sum(:amount),
                      :<=, 1_000_000
    end
  end

  # --- El timeout se traduce a Result, no a excepcion -----------------------

  def test_lock_timeout_devuelve_result_con_error_y_no_excepcion
    tomado = Queue.new
    soltar = Queue.new

    hilo = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          CostCenter.lock.find(@centro.id)
          tomado << :si
          soltar.pop
        end
      end
    end

    tomado.pop

    resultado = nil
    # Un lock ocupado NO puede llegar al usuario como un 500 con backtrace: es
    # una condicion esperada y se informa como cualquier otro error de negocio.
    assert_nothing_raised do
      resultado = ExpenseBudgetService.create_budget!(cost_center_id: @centro.id,
                                                      user_id: @ingeniero.id,
                                                      amount: 100_000, actor: @admin,
                                                      lock_timeout_ms: TIMEOUT_CORTO_MS)
    end

    assert_predicate resultado, :error?
    assert_equal ["El centro de costos está siendo actualizado por otra operación. Intente nuevamente"],
                 resultado.errors
  ensure
    soltar << :ya
    hilo&.join
  end

  private

  # `delete_all` y NO `destroy_all`: destroy dispararia los callbacks de
  # auditoria, que corren sin User.current fuera de un request y reventarian el
  # propio teardown. Ademas dejaria RegisterEdit de basura.
  def limpiar
    ReportExpense.delete_all
    ExpenseBudget.delete_all
  end

  def crear_partida(amount)
    ExpenseBudgetService.create_budget!(cost_center_id: @centro.id, user_id: @ingeniero.id,
                                        amount: amount, actor: @admin).value
  end

  def crear_gasto(valor)
    gasto = ReportExpense.new(user_id: @admin.id, cost_center_id: @centro.id,
                              user_invoice_id: @ingeniero.id, invoice_name: "Gasto simultaneo",
                              invoice_date: Date.new(2026, 6, 1), invoice_value: valor,
                              invoice_tax: 0, invoice_total: valor)
    ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)
  end

  # Arranca `cantidad` hilos y los suelta a la vez con una barrera de dos colas.
  # Sin la barrera el primer hilo terminaria antes de que el segundo nazca y no
  # habria nada que serializar.
  #
  # Cada hilo toma su PROPIA conexion del pool: sin `with_connection` compartirian
  # la del hilo principal y no habria dos transacciones que colisionar.
  def en_paralelo(cantidad)
    listos = Queue.new
    partida = Queue.new
    resultados = Array.new(cantidad)

    hilos = Array.new(cantidad) do |i|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          listos << i
          partida.pop
          resultados[i] = yield
        end
      end
    end

    cantidad.times { listos.pop }
    cantidad.times { partida << :ya }
    hilos.each(&:join)

    resultados
  end
end
