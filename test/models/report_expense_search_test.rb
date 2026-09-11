require "test_helper"

# Red de seguridad de ReportExpense.search.
#
# POR QUE EXISTE: la version original definia 15 scopes de CLASE en runtime en
# cada llamada (`scope :centro, -> { ... }`) y despues los encadenaba. Los scopes
# viven en la clase, no en la llamada, asi que dos requests simultaneos se pisan
# los filtros entre si: el usuario A puede recibir los gastos filtrados por los
# criterios del usuario B. Este archivo congela el comportamiento CORRECTO de los
# 15 filtros para poder cambiar la implementacion sin cambiar la pantalla.
#
# Se escribio ANTES del refactor (tarea B1) y solo despues se reescribio el
# modelo (B2). Los tres ultimos casos fallaban con el codigo viejo; esa es la
# demostracion del bug, no un accidente.
class ReportExpenseSearchTest < ActiveSupport::TestCase
  # Punto unico de entrada a search. En B1 traducia el hash a los 15
  # posicionales del codigo viejo; tras B2 delega directamente.
  def search_for(receptor = ReportExpense, **f)
    receptor.search(f)
  end

  setup do
    # Universo determinista: se vacia la tabla (delete_all no dispara
    # before_destroy) para que las aserciones sean sobre conjuntos de ids
    # exactos y no "los mios mas los de las fixtures". La transaccion del test
    # lo revierte.
    ReportExpense.delete_all

    @centro_a = cost_centers(:centro_sin_viaticos)
    @centro_b = cost_centers(:centro_ajeno)
    @usuario_a = users(:ingeniero_dos)
    @usuario_b = users(:contador)

    @tipo_uno = report_expense_options(:opcion_tipo)
    @pago_uno = report_expense_options(:opcion_pago)
    @tipo_dos = ReportExpenseOption.create!(name: "Transporte", category: "Tipo", user_id: users(:admin).id)
    @pago_dos = ReportExpenseOption.create!(name: "Tarjeta", category: "Medio de pago", user_id: users(:admin).id)

    as_user(users(:admin)) do
      @g1 = crear(centro: @centro_a, responsable: @usuario_a, nombre: "Hotel Dann",
                  fecha: Date.new(2026, 3, 10), identificacion: "900123456",
                  descripcion: "Hospedaje en Bogota", numero: "FE-4821",
                  tipo: @tipo_uno, pago: @pago_uno, valor: 1000.0, iva: 190.0, aceptado: true)
      @g2 = crear(centro: @centro_a, responsable: @usuario_b, nombre: "Taxi Aeropuerto",
                  fecha: Date.new(2026, 3, 15), identificacion: "800999111",
                  descripcion: "Transporte terrestre", numero: "FE-0002",
                  tipo: @tipo_uno, pago: @pago_uno, valor: 2000.0, iva: 380.0, aceptado: false)
      @g3 = crear(centro: @centro_b, responsable: @usuario_a, nombre: "Almuerzo Corrientazo",
                  fecha: Date.new(2026, 3, 20), identificacion: "700222333",
                  descripcion: "Alimentacion en obra", numero: "FE-0003",
                  tipo: @tipo_dos, pago: @pago_dos, valor: 3000.0, iva: 570.0, aceptado: true)
      @g4 = crear(centro: @centro_b, responsable: @usuario_b, nombre: "Peaje Norte",
                  fecha: Date.new(2026, 3, 25), identificacion: "600333444",
                  descripcion: "Peajes de la ruta", numero: "FE-0004",
                  tipo: @tipo_dos, pago: @pago_dos, valor: 4000.0, iva: 760.0, aceptado: false)
      @g5 = crear(centro: @centro_b, responsable: @usuario_b, nombre: "Papeleria Dann",
                  fecha: Date.new(2026, 3, 30), identificacion: "500444555",
                  descripcion: "Insumos de oficina", numero: "FE-0005",
                  tipo: @tipo_dos, pago: @pago_dos, valor: 5000.0, iva: 950.0, aceptado: false)
    end

    @todos = [@g1, @g2, @g3, @g4, @g5].map(&:id).sort
  end

  def crear(centro:, responsable:, nombre:, fecha:, identificacion:, descripcion:, numero:,
            tipo:, pago:, valor:, iva:, aceptado:)
    ReportExpense.create!(
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true,
      user_id: users(:admin).id,
      cost_center_id: centro.id,
      user_invoice_id: responsable.id,
      invoice_name: nombre,
      invoice_date: fecha,
      identification: identificacion,
      description: descripcion,
      invoice_number: numero,
      type_identification_id: tipo.id,
      payment_type_id: pago.id,
      invoice_value: valor,
      invoice_tax: iva,
      invoice_total: valor + iva,
      is_acepted: aceptado
    )
  end

  def ids(relacion)
    relacion.pluck(:id).sort
  end

  # 1
  def test_filtra_por_cost_center_id
    assert_equal [@g1.id, @g2.id].sort, ids(search_for(cost_center_id: @centro_a.id))
  end

  # 2
  def test_filtra_por_user_invoice_id
    assert_equal [@g1.id, @g3.id].sort, ids(search_for(user_invoice_id: @usuario_a.id))
  end

  # 3
  def test_filtra_por_invoice_name_like_case_insensitive
    assert_equal [@g1.id], ids(search_for(invoice_name: "HOTEL"))
  end

  # 4
  def test_filtra_por_invoice_name_parcial
    # Comodines a ambos lados: "ann" cae en medio de "Dann".
    assert_equal [@g1.id, @g5.id].sort, ids(search_for(invoice_name: "ann"))
  end

  # 5
  def test_filtra_por_invoice_date_exacta
    assert_equal [@g1.id], ids(search_for(invoice_date: Date.new(2026, 3, 10)))
  end

  # 6
  def test_filtra_por_identification_exacta
    assert_equal [@g1.id], ids(search_for(identification: "900123456"))
    # Es igualdad, no LIKE: un prefijo no devuelve nada.
    assert_equal [], ids(search_for(identification: "9001"))
  end

  # 7
  def test_filtra_por_description_like_case_insensitive
    assert_equal [@g2.id], ids(search_for(description: "TRANSPORTE"))
  end

  # 8
  def test_filtra_por_invoice_number_exacto
    assert_equal [@g1.id], ids(search_for(invoice_number: "FE-4821"))
  end

  # 9
  def test_filtra_por_type_identification_id
    assert_equal [@g1.id, @g2.id].sort, ids(search_for(type_identification_id: @tipo_uno.id))
  end

  # 10
  def test_filtra_por_payment_type_id
    assert_equal [@g1.id, @g2.id].sort, ids(search_for(payment_type_id: @pago_uno.id))
  end

  # 11
  def test_filtra_por_invoice_value_exacto
    assert_equal [@g1.id], ids(search_for(invoice_value: 1000.0))
  end

  # 12
  def test_filtra_por_invoice_tax_exacto
    assert_equal [@g1.id], ids(search_for(invoice_tax: 190.0))
  end

  # 13
  def test_filtra_por_invoice_total_exacto
    assert_equal [@g1.id], ids(search_for(invoice_total: 1190.0))
  end

  # 14
  def test_start_date_incluye_el_borde
    # g3 tiene invoice_date == start_date y SI aparece (>=).
    assert_equal [@g3.id, @g4.id, @g5.id].sort, ids(search_for(start_date: Date.new(2026, 3, 20)))
  end

  # 15
  def test_end_date_incluye_el_borde
    assert_equal [@g1.id, @g2.id, @g3.id].sort, ids(search_for(end_date: Date.new(2026, 3, 20)))
  end

  # 16
  def test_start_y_end_date_juntos_definen_rango_cerrado
    assert_equal [@g2.id, @g3.id, @g4.id].sort,
                 ids(search_for(start_date: Date.new(2026, 3, 15), end_date: Date.new(2026, 3, 25)))
  end

  # 17
  def test_filtra_por_is_acepted_true_string
    assert_equal [@g1.id, @g3.id].sort, ids(search_for(is_acepted: "true"))
  end

  # 18
  def test_filtra_por_is_acepted_false_string
    # CASO BORDE: "false" es present? => el filtro se aplica y where(is_acepted:
    # "false") tipa a false. Devuelve los NO aceptados, no todos.
    assert_equal [@g2.id, @g4.id, @g5.id].sort, ids(search_for(is_acepted: "false"))
  end

  # 19
  def test_sin_filtros_devuelve_todos
    assert_equal @todos, ids(search_for)
    assert_equal ids(ReportExpense.all), ids(search_for)
  end

  # 20
  def test_filtros_nil_y_vacios_se_ignoran
    assert_equal @todos, ids(search_for(cost_center_id: nil, invoice_name: "", identification: "",
                                        start_date: nil, is_acepted: ""))
  end

  # 21
  def test_dos_filtros_se_combinan_con_and
    assert_equal [@g1.id], ids(search_for(cost_center_id: @centro_a.id, is_acepted: "true"))
  end

  # 22
  def test_respeta_el_scope_del_receptor
    # Es lo que hacen update_filter_values y download_file para el usuario que no
    # tiene "Ver todos": si search descartara el receptor, ese usuario veria los
    # gastos de todos.
    relacion = search_for(ReportExpense.where(user_invoice_id: @usuario_b.id),
                          cost_center_id: @centro_b.id)
    assert_equal [@g4.id, @g5.id].sort, ids(relacion)
  end

  # 23
  def test_respeta_los_includes_del_receptor
    relacion = search_for(ReportExpense.includes(:cost_center), cost_center_id: @centro_a.id)
    assert_equal [:cost_center], relacion.includes_values
  end

  # 24
  def test_devuelve_una_relation_encadenable
    r = search_for(cost_center_id: @centro_b.id)
    assert_kind_of ActiveRecord::Relation, r
    assert_equal 1, r.order(:id).limit(1).to_a.size
    assert_equal 3, r.count
  end

  # 25
  def test_invoice_name_no_string_no_revienta
    # FALLA CON EL CODIGO VIEJO: hacia search3.downcase sobre un Integer.
    assert_equal [], ids(search_for(invoice_name: 123))
  end

  # 26
  def test_search_no_define_scopes_de_clase
    # FALLA CON EL CODIGO VIEJO: cada llamada definia 15 scopes de clase.
    antes = ReportExpense.singleton_methods.sort
    search_for(cost_center_id: @centro_a.id)
    assert_equal antes, ReportExpense.singleton_methods.sort

    %i[centro name_gasto indetificacion numero_factura fdesdep fhastap estado].each do |viejo|
      refute_respond_to ReportExpense, viejo
    end
  end
end

# Demostracion del bug de concurrencia. Va en SU PROPIA clase porque desactivar
# las transacciones ensucia y ralentiza al resto: con use_transactional_tests en
# true los hilos abren OTRA conexion, no ven los datos del setup y el test pasa
# siempre (verde falso).
class ReportExpenseSearchConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false

  HILOS = 4          # el pool de AR es 5 (config/database.yml)
  ITERACIONES = 100

  setup do
    @centro_uno = cost_centers(:centro_sin_viaticos)
    @centro_dos = cost_centers(:centro_ajeno)
    @ids = []

    as_user(users(:admin)) do
      10.times do |i|
        [@centro_uno, @centro_dos].each do |centro|
          gasto = ReportExpense.create!(
        omitir_comprobante_obligatorio: true,
            user_id: users(:admin).id,
            cost_center_id: centro.id,
            user_invoice_id: users(:ingeniero_dos).id,
            invoice_name: "Concurrencia #{centro.id}-#{i}",
            invoice_date: Date.new(2026, 4, 1),
            invoice_value: 100.0, invoice_tax: 19.0, invoice_total: 119.0
          )
          @ids << gasto.id
        end
      end
    end
  end

  teardown do
    # delete_all para no disparar before_destroy (auditoria). Sin este teardown
    # se quedan 20 gastos en la BD de test y rompen los demas archivos.
    ReportExpense.where(id: @ids).delete_all
  end

  def test_no_hay_fuga_de_filtros_entre_hilos
    violaciones = Queue.new
    reportaba = Thread.report_on_exception
    Thread.report_on_exception = false

    hilos = HILOS.times.map do |n|
      centro = n.even? ? @centro_uno : @centro_dos
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          ITERACIONES.times do
            valores = ReportExpense.search(cost_center_id: centro.id).pluck(:cost_center_id)
            violaciones << [centro.id, valores.uniq] if valores.uniq != [centro.id]
          end
        end
      rescue => e
        # Con el codigo viejo aparecen ademas ActiveRecord::StatementInvalid
        # esporadicos: tambien son violaciones.
        violaciones << [centro.id, "#{e.class}: #{e.message}"]
      end
    end

    hilos.each(&:join)
    Thread.report_on_exception = reportaba

    assert violaciones.empty?,
           "fuga de filtros entre hilos: #{violaciones.size} lecturas contaminadas"
  end
end
