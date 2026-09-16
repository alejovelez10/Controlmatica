# Cada regla decide si FRENA la creacion del gasto o solo la explica
# (pedido de producto, 2026-09-15).
#
# `default: true` Y NO `false`, Y ES LA DECISION IMPORTANTE DE ESTA MIGRACION:
# la adenda A.2 (2026-08-29) dejo las reglas duras, y con `default: false` esta
# migracion aflojaria de golpe TODAS las reglas que hoy existen en produccion,
# sin que nadie lo hubiera pedido regla por regla. Con `true`, correr la
# migracion no cambia ni un comportamiento: quien quiera una regla blanda la
# desmarca a mano y afloja esa sola.
#
# NO LLEVA INDICE: `mandatory` nunca se filtra en una consulta. Se lee sobre las
# reglas que `ExpenseRule.aplicables_a` ya trajo a memoria (son una o dos por
# persona), asi que un indice seria peso de escritura sin lectura que lo use.
class AddMandatoryToExpenseRules < ActiveRecord::Migration[6.1]
  def change
    add_column :expense_rules, :mandatory, :boolean, default: true, null: false
  end
end
