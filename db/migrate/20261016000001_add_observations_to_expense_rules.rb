# Observaciones de la regla (2026-10-16): una descripcion libre para quien
# administra —que busca la regla, quien la pidio, desde cuando—. NO la lee el
# servidor ni el agente: lo que el agente juzga va en `agent_instructions`.
#
# `text` y no `string`, por lo mismo que `report_expenses.observations`: un
# varchar(255) en un campo libre se llena, y Postgres no trunca, RECHAZA la
# escritura entera.
class AddObservationsToExpenseRules < ActiveRecord::Migration[6.1]
  def change
    add_column :expense_rules, :observations, :text
  end
end
