require "test_helper"

# Reporte de servicio SIN centro de costos (2026-10-18): el sistema crea el
# centro, y su propietario ya no es quien hizo el reporte sino el que se elige
# en el formulario, entre las personas con «Puede ser propietario».
class ReportPropietarioDelCentroTest < ActiveSupport::TestCase
  setup do
    @accion = AccionModule.create!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                                   module_control: module_controls(:centro_costos),
                                   user: users(:admin))
    rols(:gerente).accion_modules << @accion
    @propietaria = users(:gerente)
    @autor = users(:ingeniero)
    @cliente = customers(:cliente_uno)
    # Crear un centro lee tres parametros de la hora (CostCenter#create_code).
    ["HORA HOMBRE COSTO", "HORA HOMBRE COTIZADA", "HORA DESPLAZAMIENTO"].each do |nombre|
      Parameterization.create!(name: nombre, money_value: 50_000, user_id: users(:admin).id)
    end
  end

  def reporte(**attrs)
    Report.new({ user_id: @autor.id, report_execute_id: @autor.id, customer: @cliente,
                 report_date: Date.current, working_time: 2, work_description: "Visita",
                 viatic_value: 0, displacement_hours: 0 }.merge(attrs))
  end

  test "sin centro y con propietario, el centro nuevo queda a nombre del propietario elegido" do
    r = reporte(cost_center_owner_id: @propietaria.id)

    assert as_user(@autor) { r.save }, r.errors.full_messages.inspect
    assert_equal @propietaria.id, r.cost_center.user_owner_id
    assert_equal @autor.id, r.cost_center.user_id, "Quien lo creo sigue siendo el autor"
  end

  test "sin centro y sin propietario no se guarda" do
    r = reporte

    assert_not as_user(@autor) { r.save }
    assert_includes r.errors.full_messages, "Elija el propietario del centro de costos que se va a crear"
    assert_nil r.cost_center_id, "No puede quedar un centro creado a medias"
  end

  test "un propietario sin el permiso «Puede ser propietario» no se acepta" do
    r = reporte(cost_center_owner_id: users(:ingeniero_dos).id)

    assert_not as_user(@autor) { r.save }
    assert_includes r.errors.full_messages, "La persona elegida no puede ser propietaria de un centro de costos"
  end

  test "con centro de costos no se pide propietario" do
    centro = cost_centers(:centro_con_viaticos)
    centro.update_columns(hour_real: 0.0, hour_cotizada: 0.0, eng_hours: 0.0)
    r = reporte(cost_center_id: centro.id)

    assert as_user(@autor) { r.save }, r.errors.full_messages.inspect
    assert_equal centro.id, r.cost_center_id
  end
end
