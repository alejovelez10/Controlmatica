# Canal propio de WhatsApp (paquete 17).
#
# whatsapp_conversations: un hilo con el agente. Se CIERRA (closed_at) en vez de
# recortarse: Claude liga su razonamiento a la conversacion exacta que lo
# produjo, asi que el historial solo crece y, cuando hay que empezar de cero
# (registro guardado, @limpiar, inactividad), se abre una fila nueva.
#
# whatsapp_messages: cada mensaje que entra o sale. El wamid de Meta es UNICO:
# Meta reintenta el webhook hasta 7 dias y documenta que llegan duplicados; el
# indice es lo que impide contestar dos veces al mismo mensaje.
class CreateWhatsappTables < ActiveRecord::Migration[6.1]
  def change
    create_table :whatsapp_conversations do |t|
      t.references :user, foreign_key: true
      t.string :wa_id
      t.string :bsuid
      t.string :flujo
      t.string :prompt_version
      t.jsonb :messages, null: false, default: []
      t.jsonb :estado, null: false, default: {}
      t.datetime :last_inbound_at
      t.datetime :closed_at
      t.string :closed_reason
      t.integer :input_tokens, null: false, default: 0
      t.integer :output_tokens, null: false, default: 0
      t.integer :cache_read_tokens, null: false, default: 0
      t.timestamps
    end
    add_index :whatsapp_conversations, [:wa_id, :closed_at]
    add_index :whatsapp_conversations, [:bsuid, :closed_at]

    create_table :whatsapp_messages do |t|
      t.string :wamid, null: false
      t.string :direction, null: false
      t.references :user, foreign_key: true
      t.references :whatsapp_conversation, foreign_key: true
      t.string :wa_id
      t.string :bsuid
      t.string :message_type
      t.text :body
      t.string :media_id
      t.string :media_mime
      t.string :media_filename
      t.string :media_file
      t.jsonb :payload, null: false, default: {}
      t.string :status, null: false, default: "recibido"
      t.text :error
      t.datetime :processed_at
      t.timestamps
    end
    add_index :whatsapp_messages, :wamid, unique: true
    add_index :whatsapp_messages, [:wa_id, :created_at]

    # BSUID de Meta (business-scoped user id). Desde abril de 2026 llega en
    # todo webhook; si la persona adopta un nombre de usuario de WhatsApp, el
    # telefono puede NO llegar y esto es lo unico que la identifica.
    add_column :users, :whatsapp_user_id, :string
    add_index :users, :whatsapp_user_id
  end
end
