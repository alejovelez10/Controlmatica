# Doble aprobacion de gastos (2026-10-18).
#
# ADITIVA Y NADA MAS, por pedido explicito: ninguna columna existente cambia y
# todos los valores por defecto dejan a las reglas y a los gastos de hoy
# funcionando exactamente igual.
#
#   * En la regla: si pide una segunda aprobacion y quien la da, un CARGO (rol)
#     o una PERSONA. `false` por defecto: ninguna regla de hoy la pide.
#   * En el gasto:
#       - `second_approval_rules`: la FOTO de las reglas que pidieron segunda
#         aprobacion cuando se registro o edito el gasto, con su aprobador. Es
#         una foto por lo mismo que `rule_violations`: configurar la doble
#         aprobacion manana no puede cambiarle el circuito a los gastos que ya
#         estan en camino. `[]` por defecto: los gastos de hoy no la piden.
#       - quien dio cada aprobacion y cuando.
#
# El estado nuevo ("pendiente_segunda") no necesita migracion: la columna
# `operational_state` es un string y la lista de valores vive en el modelo.
class DobleAprobacionDeGastos < ActiveRecord::Migration[6.1]
  def change
    add_column :expense_rules, :requires_second_approval, :boolean, default: false, null: false
    add_column :expense_rules, :second_approver_rol_id, :integer
    add_column :expense_rules, :second_approver_user_id, :integer

    add_column :report_expenses, :second_approval_rules, :jsonb, default: [], null: false
    add_column :report_expenses, :first_approved_by_id, :integer
    add_column :report_expenses, :first_approved_at, :datetime
    add_column :report_expenses, :second_approved_by_id, :integer
    add_column :report_expenses, :second_approved_at, :datetime
  end
end
