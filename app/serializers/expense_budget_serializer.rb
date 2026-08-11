# == Schema Information
#
# Table name: expense_budgets
#
#  id                  :bigint           not null, primary key
#  active              :boolean          default(TRUE), not null
#  amount              :decimal(15, 2)   default(0.0), not null
#  notes               :text
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  cost_center_id      :integer          not null
#  created_by_id       :integer
#  last_user_edited_id :integer
#  user_id             :integer          not null
#
# Indexes
#
#  index_expense_budgets_on_center_user_active  (cost_center_id,user_id,active)
#  index_expense_budgets_on_cost_center_id      (cost_center_id)
#  index_expense_budgets_on_user_id             (user_id)
#

# Forma de A.2 de 00-ARQUITECTURA.md.
#
# CERO QUERIES AQUI DENTRO. `spent` y `available` son dos SUM cada uno: si se
# resolvieran por fila, una pagina de 50 partidas costaria 100 consultas. Los
# precarga en lote `ExpenseBudgetsController#preload_amounts!` y el modelo solo
# guarda un fallback para el objeto suelto que devuelven create y update.
#
# `user` es el BENEFICIARIO y `created_by` quien la creo: son personas distintas
# casi siempre, y confundirlas en la pantalla es el error que la excepcion de
# nomenclatura de 1.1 pide leer dos veces.
class ExpenseBudgetSerializer < ActiveModel::Serializer
  # `amount`, `spent` y `available` son BigDecimal, asi que AMS los emite como
  # STRING ("500000.0"). Es lo que dice el contrato y lo que el frontend pasa por
  # parseFloat: convertirlos a float aqui perderia centavos en montos grandes.
  attributes :id, :cost_center_id, :user_id, :amount, :notes, :active,
             :spent, :available, :created_at, :updated_at

  belongs_to :user, serializer: UserSerializer
  belongs_to :created_by, serializer: UserSerializer
  belongs_to :last_user_edited, serializer: UserSerializer

  def spent
    object.spent_amount
  end

  def available
    object.available_amount
  end
end
