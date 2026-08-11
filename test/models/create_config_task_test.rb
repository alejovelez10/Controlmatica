require "test_helper"
require "rake"

# `create_config:create` es la task que arma una instalacion DESDE CERO: es la
# unica fuente de los ModuleControl en una base nueva.
#
# Un modulo que solo esta en su rake task incremental (aqui,
# permissions_expense_rules.rake) simplemente NO NACE en una instalacion limpia,
# y el sintoma es engañoso: el Administrador entra igual por su bypass
# `is_admin?` y todo "parece" bien, mientras que ningun otro rol puede siquiera
# recibir el permiso porque no hay ModuleControl al que asignarselo.
#
# Corre dentro de la transaccion del test, asi que el `destroy_all` con el que
# arranca la task se revierte al terminar.
class CreateConfigTaskTest < ActiveSupport::TestCase
  # Las 4 acciones que consulta ExpenseRulesController#rule_permission?.
  ACCIONES_ESPERADAS = ["Ingreso al modulo", "Crear", "Editar", "Eliminar"].freeze

  setup do
    @rake = Rake::Application.new
    Rake.application = @rake
    Rake::Task.define_task(:environment)
    load Rails.root.join("lib/tasks/create_config.rake")
  end

  teardown do
    Rake.application = nil
  end

  # El usuario administrador que la task crea con find_or_create_by nace ANTES de
  # que ella misma setee User.current, y los callbacks de auditoria de User leen
  # User.current.id. En un request web siempre hay uno; aqui hay que ponerlo.
  def correr_task
    as_user(users(:admin)) do
      Rake::Task["create_config:create"].reenable
      Rake::Task["create_config:create"].invoke
    end
  ensure
    User.current = nil
  end

  test "crea el modulo Reglas de gastos con sus cuatro acciones" do
    correr_task

    modulo = ModuleControl.find_by(name: "Reglas de gastos")
    assert modulo, "Una instalacion limpia se quedo sin el modulo 'Reglas de gastos'"

    # El nombre es un string literal compartido con ExpenseRulesController::MODULO
    # y con el helper authorization_expense_rules: si se escribe distinto,
    # has_menu_permission? devuelve nil y nadie se entera.
    assert_equal ExpenseRulesController::MODULO, modulo.name

    assert_equal ACCIONES_ESPERADAS.sort,
                 modulo.accion_modules.pluck(:name).sort,
                 "Las acciones tienen que ser exactamente las que consulta rule_permission?"
  end

  test "es idempotente: correrla dos veces no duplica el modulo ni sus acciones" do
    correr_task
    correr_task

    modulos = ModuleControl.where(name: "Reglas de gastos")
    assert_equal 1, modulos.count, "La segunda corrida duplico el ModuleControl"
    assert_equal ACCIONES_ESPERADAS.size, modulos.first.accion_modules.count,
                 "La segunda corrida duplico las acciones"
  end

  # Blindaje de los otros dos modulos del proyecto, que ya estaban: si alguien
  # reordena el archivo y se lleva un bloque por delante, el fallo aparece aqui y
  # no seis meses despues en una instalacion nueva del cliente.
  test "los tres modulos del proyecto de gastos nacen juntos" do
    correr_task

    ["Presupuesto", "Contabilidad", "Reglas de gastos"].each do |nombre|
      assert ModuleControl.exists?(name: nombre),
             "Falta el modulo '#{nombre}' en una instalacion desde cero"
    end
  end
end
