# == Schema Information
#
# Table name: expense_rules
#
#  id                   :bigint           not null, primary key
#  active               :boolean          default(TRUE), not null
#  agent_instructions   :text
#  check_duplicates     :boolean          default(TRUE), not null
#  is_default           :boolean          default(FALSE), not null
#  mandatory            :boolean          default(TRUE), not null
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
class ExpenseRuleSerializer < ActiveModel::Serializer
  attributes :id, :name, :active, :is_default, :mandatory,
             :max_invoice_age_days, :max_invoice_value, :check_duplicates,
             :agent_instructions, :rol_ids, :created_at, :updated_at

  has_many :rols
  belongs_to :user,             serializer: UserSerializer   # quien la creo
  belongs_to :last_user_edited, serializer: UserSerializer

  # Los ids sueltos ademas de la asociacion: el formulario del multi-select
  # trabaja con ids y hacer `rols.map(&:id)` en el frontend obliga a recorrer
  # la lista en cada render.
  def rol_ids
    object.rols.map(&:id)
  end
end
