# Violaciones de reglas guardadas en el propio gasto (paquete 14, Tarea 4).
#
# POR QUE SE PERSISTEN Y NO SE RECALCULAN AL LEER: una violacion es una foto del
# momento en que se registro el gasto. Si el administrador afloja la regla
# manana, el gasto de hoy no deberia dejar de estar marcado de forma retroactiva;
# y al reves, endurecerla no puede convertir en infractores a 5.000 gastos
# historicos. Ademas la tabla de gastos tiene que poder mostrar la advertencia
# sin recorrer las reglas de cada responsable fila por fila.
#
# jsonb y no json: soporta indices y operadores de contencion si algun dia hay
# que filtrar por codigo de violacion. El default es `[]` (array vacio), NO NULL:
# el frontend hace `.length` sobre el valor y `null.length` revienta la tabla.
class AddRuleViolationsToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expenses, :rule_violations)
      add_column :report_expenses, :rule_violations, :jsonb, null: false, default: []
    end
  end

  def down
    remove_column :report_expenses, :rule_violations, if_exists: true
  end
end
