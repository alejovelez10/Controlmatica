# Por donde entro cada gasto y cada reporte de servicio (paquete 17, 2026-10-23).
#
# "web" por defecto, tambien para todo lo que ya existe (decision del usuario:
# los historicos de Taimes no se distinguen). "whatsapp" lo pone el agente al
# crear (server_context[:canal] en las tools del MCP), y aqui se marcan los que
# ya creo, sacados de la conversacion que los registro.
class AddOrigenToReportExpensesAndReports < ActiveRecord::Migration[6.1]
  def up
    add_column :report_expenses, :origen, :string, null: false, default: "web"
    add_column :reports, :origen, :string, null: false, default: "web"
    add_index :report_expenses, :origen
    add_index :reports, :origen

    { "report_expenses" => "gasto", "reports" => "reporte" }.each do |tabla, tipo|
      execute <<~SQL.squish
        UPDATE #{tabla} SET origen = 'whatsapp'
        WHERE id IN (
          SELECT (estado -> 'borrador' ->> 'registro_id')::bigint
          FROM whatsapp_conversations
          WHERE closed_reason = 'registro'
            AND estado -> 'borrador' ->> 'tipo' = '#{tipo}'
            AND (estado -> 'borrador' ->> 'registro_id') ~ '^[0-9]+$'
        )
      SQL
    end
  end

  def down
    remove_index :reports, :origen
    remove_index :report_expenses, :origen
    remove_column :reports, :origen
    remove_column :report_expenses, :origen
  end
end
