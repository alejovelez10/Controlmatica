# == Schema Information
#
# Table name: whatsapp_conversations
#
#  id                :bigint           not null, primary key
#  bsuid             :string
#  cache_read_tokens :integer          default(0), not null
#  closed_at         :datetime
#  closed_reason     :string
#  estado            :jsonb            not null
#  flujo             :string
#  input_tokens      :integer          default(0), not null
#  last_inbound_at   :datetime
#  messages          :jsonb            not null
#  output_tokens     :integer          default(0), not null
#  prompt_version    :string
#  wa_id             :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  user_id           :bigint
#
# Indexes
#
#  index_whatsapp_conversations_on_bsuid_and_closed_at  (bsuid,closed_at)
#  index_whatsapp_conversations_on_user_id              (user_id)
#  index_whatsapp_conversations_on_wa_id_and_closed_at  (wa_id,closed_at)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#

# Un hilo de conversacion con el agente (paquete 17).
#
# EL HISTORIAL SOLO CRECE. Claude liga su razonamiento a la conversacion exacta
# que lo produjo: recortar o editar turnos viejos invalida el hilo (400 en las
# cuentas nuevas). Cuando hay que empezar de cero no se recorta: se CIERRA esta
# fila y se abre otra (ver `.vigente_para` y `cerrar!`).
class WhatsappConversation < ApplicationRecord
  # Sin escribir durante este tiempo, el siguiente mensaje abre una
  # conversacion nueva: nadie retoma un gasto a medias despues de dos horas, y
  # arrastrar ese contexto solo encarece cada turno.
  INACTIVIDAD = 2.hours

  belongs_to :user, optional: true
  has_many :whatsapp_messages, dependent: :nullify

  scope :abiertas, -> { where(closed_at: nil) }

  # La conversacion abierta de este remitente, o una nueva si no hay o si la
  # que habia quedo inactiva. Busca por telefono y, si no llego, por BSUID.
  def self.vigente_para(user:, wa_id:, bsuid:, ahora: Time.current)
    actual = abiertas.where(wa_id_o_bsuid(wa_id, bsuid)).order(:created_at).last
    if actual && actual.last_inbound_at && actual.last_inbound_at < ahora - INACTIVIDAD
      actual.cerrar!("inactividad")
      actual = nil
    end
    actual || create!(user: user, wa_id: wa_id, bsuid: bsuid)
  end

  def self.wa_id_o_bsuid(wa_id, bsuid)
    return { wa_id: wa_id } if wa_id.present?

    { bsuid: bsuid }
  end
  private_class_method :wa_id_o_bsuid

  def cerrar!(motivo)
    update!(closed_at: Time.current, closed_reason: motivo)
  end

  def abierta?
    closed_at.nil?
  end
end
