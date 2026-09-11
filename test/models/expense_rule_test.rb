# == Schema Information
#
# Table name: expense_rules
#
#  id                   :bigint           not null, primary key
#  active               :boolean          default(TRUE), not null
#  agent_instructions   :text
#  check_duplicates     :boolean          default(TRUE), not null
#  is_default           :boolean          default(FALSE), not null
#  max_invoice_age_days :integer
#  max_invoice_value    :decimal(15, 2)
#  name                 :string           not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  last_user_edited_id  :integer
#  user_id              :integer
#
# Indexes
#
#  index_expense_rules_on_active              (active)
#  index_expense_rules_on_is_default          (is_default)
#  index_expense_rules_unique_default_active  (is_default) UNIQUE WHERE (is_default AND active)
#
require "test_helper"

# Modelo de regla de gastos (paquete 14, tarea 2).
#
# Lo que este archivo cuida por encima de todo es LA RESOLUCION: que regla aplica
# a quien. Es la parte del diseno donde se cometen los errores, porque tiene tres
# ramas y la tercera ("no hay nada") es la que se olvida.
class ExpenseRuleTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
    @gerente = users(:gerente)     # tiene `directivos` y `directivos_estricta`
    @ingeniero = users(:ingeniero) # solo tiene `historica`, que esta INACTIVA
    @contador = users(:contador)   # no tiene ninguna
  end

  def crear_regla(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Regla #{SecureRandom.hex(3)}", user: @admin }.merge(attrs))
    end
  end

  test "el nombre es obligatorio" do
    regla = ExpenseRule.new(active: true)

    refute regla.valid?
    assert_includes regla.errors.attribute_names, :name
  end

  test "no se pueden tener dos reglas default activas" do
    crear_regla(is_default: true, active: true)

    segunda = ExpenseRule.new(name: "Otra por defecto", is_default: true, active: true)

    refute segunda.valid?
    # El mensaje tiene que decir QUE hacer, no solo que esta mal: quien
    # administra no sabe que existe otra regla marcada.
    assert(segunda.errors.full_messages.any? { |m| m.include?("regla por defecto") })
  end

  test "si se puede tener una default activa y otra default inactiva" do
    # `historica` de las fixtures ya es default + inactiva. El indice unico
    # parcial es `WHERE (is_default AND active)`, asi que las dos conviven.
    assert expense_rules(:historica).is_default
    refute expense_rules(:historica).active

    activa = ExpenseRule.new(name: "Regla general", is_default: true, active: true, user: @admin)

    assert activa.valid?, activa.errors.full_messages.inspect
    assert_nothing_raised { as_user(@admin) { activa.save! } }
  end

  test "max_invoice_age_days negativo es invalido" do
    regla = ExpenseRule.new(name: "Negativa", max_invoice_age_days: -5)

    refute regla.valid?
    assert_includes regla.errors.attribute_names, :max_invoice_age_days
  end

  test "max_invoice_value negativo es invalido" do
    regla = ExpenseRule.new(name: "Negativa", max_invoice_value: -1)

    refute regla.valid?
    assert_includes regla.errors.attribute_names, :max_invoice_value
  end

  test "nil en los dos limites es valido y significa sin limite" do
    regla = ExpenseRule.new(name: "Sin limites", max_invoice_age_days: nil, max_invoice_value: nil)

    assert regla.valid?, regla.errors.full_messages.inspect
  end

  test "no se repite el nombre entre reglas activas" do
    crear_regla(name: "Regla repetida", active: true)

    duplicada = ExpenseRule.new(name: "Regla repetida", active: true)

    refute duplicada.valid?
    assert_includes duplicada.errors.attribute_names, :name
  end

  test "el nombre si se puede reutilizar si la anterior esta inactiva" do
    crear_regla(name: "Regla reciclada", active: false)

    # Desactivar una regla es la forma de archivarla: el nombre tiene que poder
    # volver a usarse, o cada correccion obliga a inventar "Regla general v2".
    nueva = ExpenseRule.new(name: "Regla reciclada", active: true)

    assert nueva.valid?, nueva.errors.full_messages.inspect
  end

  test "aplicables_a devuelve las asignadas cuando el usuario tiene" do
    reglas = ExpenseRule.aplicables_a(@gerente)

    assert_equal ["Regla directivos", "Regla directivos estricta"], reglas.map(&:name).sort
  end

  test "aplicables_a cae a la default cuando el usuario no tiene ninguna" do
    default = crear_regla(name: "Regla general", is_default: true, active: true)

    assert_equal [default.id], ExpenseRule.aplicables_a(@contador).map(&:id)
  end

  test "aplicables_a devuelve vacio cuando no hay asignadas ni default" do
    # Ni el usuario tiene reglas ni existe una default activa: sin restricciones.
    # Esta es la rama que se olvida y la que produce el NoMethodError sobre nil
    # en cuanto alguien asume que siempre hay al menos una regla.
    assert_empty ExpenseRule.aplicables_a(@contador).to_a
  end

  test "aplicables_a ignora las inactivas" do
    # `historica` esta asignada al ROL del ingeniero pero inactiva: no cuenta como
    # "asignada", asi que el usuario cae al camino de la default (que no existe).
    assert_includes expense_rules(:historica).rols, @ingeniero.rol

    assert_empty ExpenseRule.aplicables_a(@ingeniero).to_a
  end

  test "aplicables_a con usuario nil devuelve vacio y no revienta" do
    # El agente puede validar un borrador sin responsable asignado todavia.
    assert_empty ExpenseRule.aplicables_a(nil).to_a
  end

  test "aplicables_a no duplica una regla asignada dos veces" do
    # El indice unico del puente lo impide en la base, pero `joins` sin
    # `distinct` duplicaria filas igual si algun dia se relaja: las
    # instrucciones del agente saldrian repetidas.
    reglas = ExpenseRule.aplicables_a(@gerente).to_a

    assert_equal reglas.map(&:id).uniq.size, reglas.size
  end

  test "una operacion sobre la regla deja registro en RegisterEdit" do
    assert_difference -> { RegisterEdit.count }, 1 do
      crear_regla(name: "Regla auditada")
    end

    registro = RegisterEdit.order(:id).last
    assert_equal "Reglas de gastos", registro.module
    assert_equal "creo", registro.type_edit
    assert_includes registro.description, "Regla auditada"
  end
end
