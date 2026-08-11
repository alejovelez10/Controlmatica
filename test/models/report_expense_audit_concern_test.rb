require "test_helper"

# Tests del concern RegisterAuditable sobre ReportExpense.
#
# Los 14 golden de report_expense_audit_legacy_test.rb prueban que el HTML no
# cambio. Estos 11 prueban lo que los golden no pueden ver: la declaracion, el
# actor, los umbrales y los dos casos borde que el legado nunca soporto (FK
# colgante y ausencia total de actor).
class ReportExpenseAuditConcernTest < ActiveSupport::TestCase
  CLAVES_ESPERADAS = %i[
    cost_center_id user_invoice_id type_identification_id payment_type_id
    invoice_date invoice_name description identification invoice_number
    invoice_value invoice_tax invoice_total type_identification
    budget_status
    receipt_file
  ].freeze

  setup do
    @actor = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    @responsable = users(:ingeniero)
  end

  def crear_gasto(**overrides)
    atributos = {
      user_id: @actor.id,
      cost_center_id: @centro.id,
      user_invoice_id: @responsable.id,
      invoice_date: Date.new(2026, 7, 14),
      invoice_name: "Hotel Dann",
      invoice_value: 1000.0,
      invoice_tax: 190.0,
      invoice_total: 1190.0
    }.merge(overrides)

    as_user(@actor) { ReportExpense.create!(atributos) }
  end

  # Inventario declarado. Subio de 13 a 14 con `budget_status` (paquete 04) y de
  # 14 a 15 con `receipt_file` (paquete 06), tal como este mismo comentario
  # anticipaba. La cuenta es a proposito explicita: si alguien agrega un campo
  # auditado sin pasar por aqui, este test se lo dice antes de que el golden
  # falle con un diff de HTML ilegible.
  def test_audit_fields_registra_los_quince_campos
    assert_equal 15, ReportExpense.audit_fields.size
    assert_equal CLAVES_ESPERADAS.sort, ReportExpense.audit_fields.keys.sort
    assert_includes ReportExpense.audit_fields.keys, :budget_status
    assert_includes ReportExpense.audit_fields.keys, :receipt_file
  end

  def test_layout_de_creacion_repite_identification
    assert_equal 2, ReportExpense.audit_options[:create_fields].count(:identification)
  end

  def test_layout_de_edicion_incluye_type_identification_y_el_de_creacion_no
    assert_includes ReportExpense.audit_options[:edit_fields], :type_identification
    refute_includes ReportExpense.audit_options[:create_fields], :type_identification
  end

  def test_segmento_de_asociacion_guarda_el_nombre_legible_no_el_id
    gasto = crear_gasto
    campo = ReportExpense.audit_fields[:cost_center_id]
    segmento = gasto.render_audit_segment(campo, :create)

    assert_includes segmento, @centro.code
    refute_includes segmento, @centro.id.to_s
  end

  def test_asociacion_colgante_no_revienta
    # CAMBIO DE COMPORTAMIENTO respecto del legado (asumido y declarado): con la
    # FK colgada, create_destroy_register reventaba con NoMethodError sobre nil
    # y el registro no se podia borrar. Ahora renderiza vacio.
    gasto = crear_gasto
    ReportExpense.where(id: gasto.id).update_all(cost_center_id: 999_999)
    gasto.reload

    campo = ReportExpense.audit_fields[:cost_center_id]
    assert_equal "<p>Centro de costo: <b></b></p>", gasto.render_audit_segment(campo, :create)

    as_user(@actor) do
      assert_nothing_raised { gasto.destroy }
    end
  end

  def test_audit_actor_id_usa_user_current_cuando_existe
    gasto = crear_gasto
    as_user(@actor) do
      assert_equal @actor.id, gasto.audit_actor_id
    end
  end

  def test_audit_actor_id_cae_a_user_id_cuando_no_hay_user_current
    gasto = crear_gasto
    User.current = nil
    assert_equal gasto.user_id, gasto.audit_actor_id
  end

  def test_sin_actor_ni_fks_no_revienta_y_no_audita
    # HONESTIDAD SOBRE ESTE TEST: en ReportExpense el actor nulo es
    # INALCANZABLE por datos. `belongs_to :user_invoice` es obligatorio, asi que
    # aunque falten User.current, user_id y last_user_edited_id, user_invoice_id
    # sigue siendo un respaldo valido. Por eso el nil se fuerza sobreescribiendo
    # audit_actor_id en el objeto: lo que se prueba es la GUARDA del concern
    # (RegisterEdit.create sin bang), no un escenario que se pueda dar hoy en
    # produccion. La guarda importa porque los modelos que adopten el concern
    # despues si pueden quedarse sin actor.
    gasto = crear_gasto
    ReportExpense.where(id: gasto.id).update_all(user_id: nil, last_user_edited_id: nil)
    gasto.reload
    gasto.define_singleton_method(:audit_actor_id) { nil }

    User.current = nil
    assert_nil gasto.audit_actor_id

    # RegisterEdit.create no es bang (rareza 16): la auditoria se pierde en
    # silencio, pero el gasto SI queda persistido.
    assert_no_difference("RegisterEdit.count") do
      gasto.invoice_value = 7777.0
      assert gasto.save
    end
    assert_equal 7777.0, gasto.reload.invoice_value
  end

  def test_umbral_de_edicion_es_59_y_es_el_largo_del_encabezado
    assert_equal 59, ReportExpense.audit_options[:edit_header].length
    assert_equal 59, ReportExpense.audit_options[:edit_min_length]
  end

  def test_touch_last_user_edited_en_edicion
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_value: 2.0) }
    assert_equal @actor.id, gasto.last_user_edited_id
  end

  def test_el_modelo_ya_no_define_los_metodos_viejos
    # Impide que alguien deje los metodos viejos "por si acaso" y queden dos
    # auditorias por operacion.
    gasto = crear_gasto
    %i[create_edit_register create_create_register create_destroy_register].each do |metodo|
      refute_respond_to gasto, metodo
      refute gasto.respond_to?(metodo, true), "#{metodo} sigue existiendo (aunque sea privado)"
    end
  end
end
