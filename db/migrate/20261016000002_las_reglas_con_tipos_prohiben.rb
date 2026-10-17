# Desde el 2026-10-16 los tipos de una regla son los que NO se pueden registrar
# (ver ExpenseRule#prohibir_si_tiene_tipos). `prohibits_expense` pasa a ser
# derivado: true si la regla tiene tipos. Esta migracion lo pone al dia en las
# reglas que ya existen.
#
# En produccion, el 2026-10-16, la unica regla que cambia es la 67 («CREAR
# GASTOS DE REPRESENTACION»): tenia el tipo elegido y la casilla «Prohibir el
# gasto» sin marcar, y por eso dejaba crear los gastos que el cliente queria
# frenar. Las otras reglas con tipos ya prohibian (102) o solo usan «excepto»
# (101), que no cambia.
#
# SQL directo y no el modelo: los callbacks de auditoria de ExpenseRule exigen
# un User.current que una migracion no tiene. Sin `down`: no hay forma de saber
# que reglas tenian la casilla desmarcada a proposito, y volver a desmarcarla
# devolveria el error que esto corrige.
class LasReglasConTiposProhiben < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL
      UPDATE expense_rules
      SET prohibits_expense = EXISTS (
        SELECT 1 FROM expense_rules_included_types t WHERE t.expense_rule_id = expense_rules.id
      )
    SQL
  end

  def down
    # Irreversible a proposito: ver el comentario de la clase.
  end
end
