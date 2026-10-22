# Usuario de WhatsApp (paquete 17, 2026-10-22).
#
# Quien tiene nombre de usuario en WhatsApp puede ocultar su numero: entonces
# Meta solo manda su identificador anonimo (BSUID) y su usuario
# (contacts[].profile.username). El administrador registra ese usuario al lado
# del telefono y el agente lo reconoce por cualquiera de los dos.
#
# Se guarda normalizado (sin "@", en minusculas), asi el indice unico basta
# para que dos personas no tengan el mismo. En whatsapp_messages queda el
# usuario con el que llego cada mensaje, para identificarlo en el job.
class AddWhatsappUsername < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :whatsapp_username, :string
    add_index :users, :whatsapp_username, unique: true, where: "whatsapp_username IS NOT NULL"

    add_column :whatsapp_messages, :username, :string
  end
end
