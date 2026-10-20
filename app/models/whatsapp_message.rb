# == Schema Information
#
# Table name: whatsapp_messages
#
#  id                       :bigint           not null, primary key
#  body                     :text
#  bsuid                    :string
#  direction                :string           not null
#  error                    :text
#  media_file               :string
#  media_filename           :string
#  media_mime               :string
#  message_type             :string
#  payload                  :jsonb            not null
#  processed_at             :datetime
#  status                   :string           default("recibido"), not null
#  wa_id                    :string
#  wamid                    :string           not null
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  media_id                 :string
#  user_id                  :bigint
#  whatsapp_conversation_id :bigint
#
# Indexes
#
#  index_whatsapp_messages_on_user_id                   (user_id)
#  index_whatsapp_messages_on_wa_id_and_created_at      (wa_id,created_at)
#  index_whatsapp_messages_on_wamid                     (wamid) UNIQUE
#  index_whatsapp_messages_on_whatsapp_conversation_id  (whatsapp_conversation_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#  fk_rails_...  (whatsapp_conversation_id => whatsapp_conversations.id)
#

# Un mensaje de WhatsApp, entrante o saliente (paquete 17).
#
# El wamid de Meta es UNICO en la tabla: Meta reintenta el webhook hasta 7 dias
# y documenta que llegan duplicados. `registrar_entrante` devuelve nil cuando el
# mensaje ya existia, y ese nil es lo que impide encolarlo dos veces.
class WhatsappMessage < ApplicationRecord
  ENTRANTE = "entrante".freeze
  SALIENTE = "saliente".freeze

  belongs_to :user, optional: true
  belongs_to :whatsapp_conversation, optional: true

  mount_uploader :media_file, WhatsappMediaUploader

  scope :entrantes, -> { where(direction: ENTRANTE) }
  scope :salientes, -> { where(direction: SALIENTE) }

  # nil si el wamid ya estaba: es un reintento de Meta y no se vuelve a atender.
  def self.registrar_entrante(datos, payload)
    create!(
      wamid: datos[:wamid], direction: ENTRANTE,
      wa_id: datos[:wa_id], bsuid: datos[:bsuid],
      message_type: datos[:tipo], body: datos[:texto],
      media_id: datos[:media_id], media_mime: datos[:media_mime],
      media_filename: datos[:media_filename],
      payload: payload
    )
  rescue ActiveRecord::RecordNotUnique
    nil
  end

  # Llave de "una conversacion a la vez": el telefono si llego, si no el BSUID.
  def remitente
    wa_id.presence || bsuid
  end

  def procesado?
    processed_at.present?
  end

  def con_archivo?
    media_id.present?
  end

  def datos
    (payload || {}).with_indifferent_access
  end
end
