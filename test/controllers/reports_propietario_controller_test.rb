require "test_helper"

# El formulario de reportes de servicio manda `cost_center_owner_id` cuando el
# reporte no trae centro (2026-10-18). Lo que se cuida aqui es que el parametro
# llegue al modelo (strong params) y que el error se le devuelva a la pantalla.
class ReportsPropietarioControllerTest < ActionDispatch::IntegrationTest
  setup do
    accion = AccionModule.create!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                                  module_control: module_controls(:centro_costos), user: users(:admin))
    rols(:gerente).accion_modules << accion
    ["HORA HOMBRE COSTO", "HORA HOMBRE COTIZADA", "HORA DESPLAZAMIENTO"].each do |nombre|
      Parameterization.create!(name: nombre, money_value: 50_000, user_id: users(:admin).id)
    end
  end

  def crear_reporte(**extra)
    post reports_path, as: :json, params: {
      customer_id: customers(:cliente_uno).id, report_execute_id: users(:admin).id,
      report_date: Date.current.iso8601, working_time: 2, displacement_hours: 0,
      work_description: "Visita técnica", viatic_value: "$0"
    }.merge(extra)
    JSON.parse(response.body)
  end

  test "sin centro y con propietario, el centro nuevo queda a su nombre" do
    sign_in_as users(:admin)
    body = crear_reporte(cost_center_owner_id: users(:gerente).id)

    assert_equal "success", body["type"], body.inspect
    centro = Report.order(:id).last.cost_center
    assert_equal users(:gerente).id, centro.user_owner_id
  end

  test "sin centro y sin propietario, la pantalla recibe el motivo" do
    sign_in_as users(:admin)
    body = crear_reporte

    assert_equal "error", body["type"]
    assert_includes body["message_error"], "Elija el propietario del centro de costos que se va a crear"
  end
end
