# Columna para curar el menu de tipos de gasto que se le ofrece al agente.
#
# El default es `true` A PROPOSITO: el dia del deploy no cambia nada, las 19
# opciones existentes siguen saliendo. La curaduria la hace el usuario desde
# el checkbox de la pantalla de administracion, y es reversible.
#
# ESTA migracion NO escribe un solo UPDATE: no hay migracion de datos y
# ninguna fila nace en `false`.
#
# Que significa apagar una opcion: "no se la ofrezcas al agente", NO "dejo de
# existir". El formulario web, la plantilla de importacion y el import
# (ReportExpense.indice_de_catalogos) siguen viendo todas, prendidas y
# apagadas — el filtro vive solo en la tool MCP.
#
# Sin indice: la tabla tiene ~22 filas y el unico filtro corre sobre esas 22.
class AddUsedByAiToReportExpenseOptions < ActiveRecord::Migration[6.1]
  def up
    unless column_exists?(:report_expense_options, :used_by_ai)
      add_column :report_expense_options, :used_by_ai, :boolean, null: false, default: true
    end
  end

  def down
    remove_column :report_expense_options, :used_by_ai, if_exists: true
  end
end
