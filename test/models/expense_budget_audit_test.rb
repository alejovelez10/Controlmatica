require "test_helper"

# Auditoria de partidas presupuestales hacia RegisterEdit.
#
# ExpenseBudget escribe su auditoria a mano en vez de usar el concern
# RegisterAuditable del paquete 03. La diferencia visible: el modulo es
# "Presupuesto" (sin el typo historico "Gatos" de ReportExpense) y la condicion
# para no escribir un registro fantasma es `partes.empty?` explicito, no el
# umbral magico de 59 caracteres.
class ExpenseBudgetAuditTest < ActiveSupport::TestCase
  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro    = cost_centers(:centro_con_viaticos)
  end

  def crear_partida(actor: @admin, **overrides)
    atributos = { cost_center: @centro, user: @ingeniero, amount: 500_000,
                  notes: "Viaticos del semestre", created_by_id: actor&.id }.merge(overrides)
    as_user(actor) { ExpenseBudget.create!(atributos) }
  end

  def test_crear_partida_genera_register_edit
    partida = nil
    assert_difference("RegisterEdit.count", 1) { partida = crear_partida }

    registro = RegisterEdit.last
    assert_equal "Presupuesto", registro.module
    assert_equal "creo", registro.type_edit
    assert_equal "pending", registro.state
    assert_equal @admin.id, registro.user_id
    # El BENEFICIARIO, no el id de la partida: `register_user` es
    # class_name: "User", asi que el `register_user_id: self.id` de
    # ReportExpense es un bug preexistente que aqui no se replica.
    assert_equal partida.user_id, registro.register_user_id
  end

  def test_crear_partida_registra_valor_y_beneficiario
    crear_partida
    descripcion = RegisterEdit.last.description

    assert_includes descripcion, "$500.000"
    assert_includes descripcion, @ingeniero.names
    assert_includes descripcion, @centro.code
    assert_includes descripcion, "(SE CREO LA SIGUIENTE PARTIDA)"
  end

  def test_editar_amount_genera_register_con_anterior_y_nuevo
    partida = crear_partida
    as_user(@admin) { partida.update!(amount: 700_000) }

    descripcion = RegisterEdit.last.description
    # En codigo nuevo `*_change[1]` (el NUEVO) va en color-true. La auditoria
    # legada de ReportExpense lo hace al reves en escalares; no se hereda.
    assert_includes descripcion, "<p>Valor: <b class='color-true'>$700.000</b> / " \
                                 "<b class='color-false'>$500.000</b></p>"
    assert_operator descripcion.index("color-true"), :<, descripcion.index("color-false")
  end

  def test_editar_active_genera_register
    partida = crear_partida
    as_user(@admin) { partida.update!(active: false) }

    descripcion = RegisterEdit.last.description
    assert_includes descripcion, "Estado:"
    assert_includes descripcion, "Inactiva"
    assert_includes descripcion, "Activa"
  end

  def test_guardar_sin_cambios_no_genera_register
    partida = crear_partida

    assert_no_difference("RegisterEdit.count") do
      as_user(@admin) { partida.save }
    end
  end

  def test_eliminar_partida_genera_register_elimino
    partida = crear_partida

    assert_difference("RegisterEdit.count", 1) do
      as_user(@admin) { partida.destroy }
    end

    registro = RegisterEdit.last
    assert_equal "elimino", registro.type_edit
    assert_equal "Presupuesto", registro.module
    assert_includes registro.description, "(SE ELIMINO LA SIGUIENTE PARTIDA)"
  end

  def test_sin_user_current_usa_created_by_como_actor
    partida = crear_partida

    # Fuera de un request web User.current es nil. Sin el fallback, el
    # `belongs_to :user` requerido de RegisterEdit reventaria dentro del callback
    # y se llevaria por delante el guardado de la partida.
    assert_difference("RegisterEdit.count", 1) do
      as_user(nil) { partida.update!(amount: 1000) }
    end

    assert_equal partida.created_by_id, RegisterEdit.last.user_id
    assert_equal @admin.id, RegisterEdit.last.user_id
  end

  def test_sin_ningun_actor_no_crea_register_ni_revienta
    # Ultimo eslabon del fallback: sin User.current, sin created_by_id y sin
    # last_user_edited_id queda el beneficiario, que es NOT NULL por esquema.
    partida = nil
    assert_nothing_raised do
      partida = as_user(nil) do
        ExpenseBudget.create!(cost_center: @centro, user: @ingeniero, amount: 50_000,
                              created_by_id: nil, last_user_edited_id: nil)
      end
    end

    assert_predicate partida, :persisted?
    assert_equal @ingeniero.id, RegisterEdit.last.user_id
    assert_equal "Presupuesto", RegisterEdit.last.module
  end
end
