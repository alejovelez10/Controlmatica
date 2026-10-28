# == Schema Information
#
# Table name: expense_rules
#
#  id                       :bigint           not null, primary key
#  active                   :boolean          default(TRUE), not null
#  agent_instructions       :text
#  applies_to_all_roles     :boolean          default(FALSE), not null
#  check_duplicates         :boolean          default(TRUE), not null
#  cross_check_receipt      :boolean          default(FALSE), not null
#  is_default               :boolean          default(FALSE), not null
#  mandatory                :boolean          default(TRUE), not null
#  max_invoice_age_days     :integer
#  max_invoice_value        :decimal(15, 2)
#  name                     :string           not null
#  observations             :text
#  prohibits_expense        :boolean          default(FALSE), not null
#  requires_second_approval :boolean          default(FALSE), not null
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  last_user_edited_id      :integer
#  second_approver_rol_id   :integer
#  second_approver_user_id  :integer
#  user_id                  :integer
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
             :agent_instructions, :rol_ids, :created_at, :updated_at,
             :applies_to_all_roles, :prohibits_expense,
             :excluded_rols, :excluded_users, :included_types, :excluded_types,
             :observations,
             # Doble aprobacion (2026-10-18). `second_approver_label` es lo que
             # pinta la tabla: "Cargo: Gerencia" o "Usuario: Ana Perez".
             :requires_second_approval, :second_approver_rol_id, :second_approver_user_id,
             :second_approver_label,
             # Cotejo del comprobante contra el formulario (2026-10-25).
             :cross_check_receipt

  has_many :rols
  belongs_to :user,             serializer: UserSerializer   # quien la creo
  belongs_to :last_user_edited, serializer: UserSerializer

  # Los ids sueltos ademas de la asociacion: el formulario del multi-select
  # trabaja con ids y hacer `rols.map(&:id)` en el frontend obliga a recorrer
  # la lista en cada render.
  def rol_ids
    object.rols.map(&:id)
  end

  # Las cuatro listas del 2026-10-14 como {id, name} planos y no como
  # asociaciones serializadas: la pantalla solo necesita el nombre para pintar
  # la tabla y el id para el multi-select, y UserSerializer completo mandaria
  # el perfil entero de cada persona excluida.
  def excluded_rols  = pares(object.excluded_rols)
  def included_types = pares(object.included_types)
  def excluded_types = pares(object.excluded_types)

  def excluded_users
    object.excluded_users.map { |u| { id: u.id, name: ExpenseRule.nombre_de_persona(u) } }
  end

  def second_approver_label
    object.requires_second_approval ? object.segundo_aprobador_label : nil
  end

  private

  def pares(registros)
    registros.map { |r| { id: r.id, name: r.name.to_s.squish } }
  end
end
