# Campo de observaciones del gasto (pedido de producto, 2026-10-06).
#
# `text` Y NO `string`, por el mismo motivo que `description` ya es `text`: un
# `varchar(255)` en un campo libre se llena, y cuando se llena Postgres no
# trunca, RECHAZA la escritura entera. El gasto no se guardaria y el usuario
# veria un error que no habla de observaciones. `budget_reason` es el precedente
# de lo contrario —es `string` y hay que truncarlo a 250 a mano para que no
# tumbe el guardado (`ReportExpense#apply_expense_rules`)—, y esa cirugia no se
# repite aqui.
#
# LO ESCRIBE QUIEN REGISTRA EL GASTO, no quien lo aprueba (decision de producto,
# 2026-10-06). El motivo de un rechazo va en su propio campo cuando llegue el
# estado de rechazo: si compartieran columna, el aprobador pisaria lo que
# escribio la persona que reporto el gasto y no quedaria rastro de ninguno de
# los dos textos.
#
# SIN INDICE Y SIN DEFAULT: no se filtra ni se ordena por observaciones, y un
# default "" obligaria a distinguir entre vacio y nulo sin que nada lo necesite.
# Los ~7.000 gastos historicos quedan en NULL, que es la verdad: nadie escribio
# nada en ellos.
class AddObservationsToReportExpenses < ActiveRecord::Migration[6.1]
  def change
    add_column :report_expenses, :observations, :text
  end
end
