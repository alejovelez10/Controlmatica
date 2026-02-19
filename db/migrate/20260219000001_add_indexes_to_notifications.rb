# frozen_string_literal: true

class AddIndexesToNotifications < ActiveRecord::Migration[5.2]
  def change
    # Índice para register_edits.state - usado en el layout para notificaciones
    unless index_exists?(:register_edits, :state)
      add_index :register_edits, :state
    end

    # Índice para notification_alerts.state - usado en el layout para alertas
    unless index_exists?(:notification_alerts, :state)
      add_index :notification_alerts, :state
    end

    # Índice compuesto para queries ordenadas
    unless index_exists?(:register_edits, [:state, :created_at])
      add_index :register_edits, [:state, :created_at], order: { created_at: :desc }
    end

    unless index_exists?(:notification_alerts, [:state, :date_update])
      add_index :notification_alerts, [:state, :date_update], order: { date_update: :desc }
    end
  end
end
