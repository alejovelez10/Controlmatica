# Informe de gastos que incumplen reglas y cotejo del comprobante (2026-10-25).
#
# ADITIVA, como la de la doble aprobacion: nada de lo que existe cambia.
#
#   * `report_expense_rule_hits`: una fila por cada regla que incumplio un gasto
#     GUARDADO, con su razon. Es lo que deja filtrar el informe por regla:
#     `rule_violations` (jsonb) no siempre sabe de que regla salio cada motivo,
#     porque los topes de varias reglas se colapsan en el mas estricto. Solo se
#     llena desde hoy; los gastos anteriores no se pasan (decision del usuario).
#     El nombre de la regla se copia: si la borran, la fila sigue diciendo cual
#     fue.
#   * `expense_rules.cross_check_receipt`: la regla pide comparar lo que dice el
#     comprobante con lo que se escribio en el formulario. `false` por defecto:
#     ninguna regla de hoy lo pide.
#   * `report_expenses.receipt_check`: lo que la IA leyo del comprobante y como
#     salio el cotejo. Se guarda para volver a comparar al editar el gasto sin
#     leer el archivo otra vez. `{}` por defecto.
class ReglasAplicadasYCotejoDelComprobante < ActiveRecord::Migration[6.1]
  def change
    create_table :report_expense_rule_hits do |t|
      t.references :report_expense, null: false, index: false,
                                    foreign_key: { on_delete: :cascade }
      t.references :expense_rule, index: false, foreign_key: { on_delete: :nullify }
      t.string :rule_name, null: false
      t.string :code, null: false
      t.text :message, null: false
      t.timestamps
    end
    # Los dos indices son los de las dos preguntas que se le hacen a la tabla:
    #   * el filtro por regla de la pestaña («que gastos incumplieron la regla
    #     7»), que con este orden se responde solo con el indice;
    #   * reescribir las filas de un gasto, a veces solo las de un codigo.
    # Cada uno cubre tambien su llave foranea para el ON DELETE.
    add_index :report_expense_rule_hits, [:expense_rule_id, :report_expense_id],
              name: "index_rule_hits_on_rule_and_expense"
    add_index :report_expense_rule_hits, [:report_expense_id, :code],
              name: "index_rule_hits_on_expense_and_code"

    add_column :expense_rules, :cross_check_receipt, :boolean, default: false, null: false
    add_column :report_expenses, :receipt_check, :jsonb, default: {}, null: false
  end
end
