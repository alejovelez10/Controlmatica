# Forma JSON de una regla de gastos (paquete 14).
#
# `users` sale como lista completa y no como conteo: la pantalla de reglas monta
# un multi-select y necesita las opciones ya seleccionadas para pintarlo. Con
# solo el conteo habria que pedir la relacion en una segunda llamada por fila.
class ExpenseRuleSerializer < ActiveModel::Serializer
  attributes :id, :name, :active, :is_default,
             :max_invoice_age_days, :max_invoice_value, :check_duplicates,
             :agent_instructions, :user_ids, :created_at, :updated_at

  has_many :users, serializer: UserSerializer
  belongs_to :user,             serializer: UserSerializer   # quien la creo
  belongs_to :last_user_edited, serializer: UserSerializer

  # Los ids sueltos ademas de la asociacion: el formulario del multi-select
  # trabaja con ids y hacer `users.map(&:id)` en el frontend obliga a recorrer
  # la lista en cada render.
  def user_ids
    object.users.map(&:id)
  end
end
