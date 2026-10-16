# Las reglas de gasto aprenden a decir A QUIEN y A QUE TIPO de gasto aplican, y
# a PROHIBIR un gasto (pedido del cliente, 2026-10-14).
#
# POR QUE: el cliente escribia esas condiciones en el texto para el agente
# ("los gastos de combustible solo para German, Julian..."; "representacion solo
# los roles administrador, comercial y administracion"; "licor solo en
# representacion"). El agente juzga leyendo el comprobante y NUNCA ve quien
# registra, su rol ni el tipo de gasto, asi que adivinaba y bloqueaba gastos
# legitimos. Son datos que el sistema ya tiene: los decide el servidor.
#
#   * applies_to_all_roles: "Todos los roles, excepto" en vez de una lista.
#     Una regla asi incluye tambien los roles que se creen despues.
#   * prohibits_expense: si la regla aplica, el gasto no se permite.
#   * cuatro tablas puente: roles excluidos, personas excluidas, tipos
#     incluidos ("solo estos tipos") y tipos excluidos ("excepto estos").
#
# ON DELETE CASCADE hacia rol, usuario y opcion: borrar un tipo de gasto desde
# Parametrizaciones (ReportExpenseOptionsController#destroy, sin manejo de error)
# no puede reventar con una FK. El costo esta acotado en el modelo: una
# prohibicion que se quede sin tipos deja de prohibir (ExpenseRule#prohibe?), en
# vez de prohibirlo todo.
class ReglasDeGastoPorTipoYExcepciones < ActiveRecord::Migration[6.1]
  TABLAS = {
    expense_rules_excluded_rols: :rol,
    expense_rules_excluded_users: :user,
    expense_rules_included_types: :report_expense_option,
    expense_rules_excluded_types: :report_expense_option
  }.freeze

  def change
    add_column :expense_rules, :applies_to_all_roles, :boolean, default: false, null: false
    add_column :expense_rules, :prohibits_expense, :boolean, default: false, null: false

    TABLAS.each do |tabla, referencia|
      create_table tabla, id: false do |t|
        t.references :expense_rule, null: false, foreign_key: { on_delete: :cascade }, index: false
        t.references referencia, null: false, foreign_key: { on_delete: :cascade }
      end

      add_index tabla, [:expense_rule_id, :"#{referencia}_id"], unique: true,
                                                                name: "index_#{tabla}_unique"
    end
  end
end
