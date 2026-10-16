require "test_helper"
require "rake"

# `rake permissions_propietario_centro:install` crea la casilla "Puede ser
# propietario" y, SOLO LA PRIMERA VEZ, se la da a los roles que hasta hoy eran
# propietarios por nombre. Lo que importa probar es esa asimetria: la primera
# corrida evita que el select amanezca vacio el dia del deploy, y las siguientes
# no pueden devolverle la casilla a un rol al que alguien se la quito.
class PermissionsPropietarioCentroRakeTest < ActiveSupport::TestCase
  setup do
    @rake = Rake::Application.new
    Rake.application = @rake
    Rake::Task.define_task(:environment)
    load Rails.root.join("lib/tasks/permissions_propietario_centro.rake")

    @comercial = Rol.create!(name: "COMERCIAL")
    @ingeniero = Rol.create!(name: "INGENIERO DE CAMPO")
  end

  teardown do
    Rake.application = nil
    User.current = nil
  end

  def instalar
    capture_io { @rake["permissions_propietario_centro:install"].tap(&:reenable).invoke }
  end

  def accion
    AccionModule.find_by!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                          module_control: module_controls(:centro_costos))
  end

  test "la primera vez crea la accion en Centro de Costos y se la da a los roles propietarios" do
    instalar

    assert_includes accion.rols, rols(:administrador)
    assert_includes accion.rols, @comercial, "El nombre del rol se compara sin mayusculas"
    assert_not_includes accion.rols, @ingeniero
  end

  test "es idempotente: correrla dos veces no duplica la accion" do
    instalar
    instalar

    assert_equal 1, AccionModule.where(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO).count
  end

  test "si ya existia no le devuelve la casilla a un rol al que se la quitaron" do
    instalar
    @comercial.accion_modules.delete(accion)

    instalar

    assert_not_includes accion.reload.rols, @comercial
  end
end
