# == Schema Information
#
# Table name: report_expense_rule_hits
#
#  id                :bigint           not null, primary key
#  code              :string           not null
#  message           :text             not null
#  rule_name         :string           not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  expense_rule_id   :bigint
#  report_expense_id :bigint           not null
#
# Indexes
#
#  index_rule_hits_on_expense_and_code  (report_expense_id,code)
#  index_rule_hits_on_rule_and_expense  (expense_rule_id,report_expense_id)
#
# Foreign Keys
#
#  fk_rails_...  (expense_rule_id => expense_rules.id) ON DELETE => nullify
#  fk_rails_...  (report_expense_id => report_expenses.id) ON DELETE => cascade
#
# Una regla que incumplio un gasto guardado, con su razon (2026-10-25).
#
# Es la tabla del informe «Incumplen reglas» de Gastos: deja filtrar por regla,
# que es lo que `ReportExpense#rule_violations` no permite (los topes de varias
# reglas se colapsan en el mas estricto y la violacion no sabe de cual salio).
#
# LA ESCRIBE SOLO EL GASTO, al registrarse o al editarse algo que las reglas
# miran (ReportExpense#registrar_reglas_aplicadas). Nadie la edita a mano.
#
# `rule_name` es la foto del nombre: si la regla se borra, `expense_rule_id`
# queda en NULL y la fila sigue diciendo cual fue. `expense_rule_id` tambien es
# NULL en un hallazgo de la IA que no dijo de que regla salio.
class ReportExpenseRuleHit < ApplicationRecord
  belongs_to :report_expense
  belongs_to :expense_rule, optional: true

  validates :rule_name, :code, :message, presence: true
end
