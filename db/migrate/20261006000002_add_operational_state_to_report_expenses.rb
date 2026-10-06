# El estado operativo del gasto pasa a ser UN campo con tres valores
# (pedido de producto, 2026-10-06): creado / aceptado / rechazado.
#
# POR QUE NO SE REUSA `is_acepted` CON NULL. Tecnicamente funcionaba —la columna
# ya es nullable y no hay ni una fila nula— pero en Postgres NULL significa "no
# se sabe", no "rechazado": un `where.not(is_acepted: true)` EXCLUYE las filas
# nulas en vez de incluirlas. Hoy no existe esa consulta; el problema es el dia
# que alguien la escriba creyendo que trae los no aceptados, sin error y sin
# aviso.
#
# ESTA MIGRACION ES EL PASO A DE DOS, Y ESO ES LO QUE DA MARCHA ATRAS:
# `is_acepted` NO se borra aqui. La aplicacion lee el campo nuevo y sigue
# escribiendo el viejo (ReportExpense#sincronizar_is_acepted), asi que si algo
# sale mal basta REVERTIR EL CODIGO: los datos estan completos en las dos
# columnas y no hay que restaurar nada con gente usando el sistema. El paso B
# —borrar `is_acepted` y dejarla como metodo derivado— va en otro despliegue,
# dias despues y con este ya probado en produccion.
#
# `default: "creado"` Y `null: false`: un gasto siempre tiene estado, y el
# default es el estado en el que nace. Postgres 11+ no reescribe la tabla por un
# default, asi que no hay bloqueo largo.
#
# LOS TRES CAMPOS DEL RECHAZO van aqui y no en la migracion del rechazo: el
# estado dice QUE paso, estos dicen quien, cuando y por que, que es lo que el
# correo de respuesta necesita. Separarlos obligaria a correr dos migraciones en
# produccion por un mismo cambio.
class AddOperationalStateToReportExpenses < ActiveRecord::Migration[6.1]
  def up
    add_column :report_expenses, :operational_state, :string, default: "creado", null: false
    add_column :report_expenses, :rejected_at, :datetime
    add_column :report_expenses, :rejected_by_id, :integer
    add_column :report_expenses, :rejection_reason, :text

    # BACKFILL. Ningun gasto historico esta rechazado —el estado no existia—,
    # asi que el mapeo es exacto y no se pierde informacion: lo aceptado queda
    # aceptado y todo lo demas, creado.
    execute <<~SQL
      UPDATE report_expenses
         SET operational_state = CASE WHEN is_acepted THEN 'aceptado' ELSE 'creado' END
    SQL

    # Se filtra por estado en la pantalla, en Contabilidad y en el consumo de
    # presupuesto, que es la consulta mas caliente del modulo. `is_acepted` ya
    # tenia su indice por lo mismo.
    add_index :report_expenses, :operational_state
  end

  def down
    # `is_acepted` nunca se dejo de escribir, asi que al volver no hay que
    # reconstruirla desde `operational_state`: ya esta al dia.
    remove_index :report_expenses, :operational_state
    remove_column :report_expenses, :rejection_reason
    remove_column :report_expenses, :rejected_by_id
    remove_column :report_expenses, :rejected_at
    remove_column :report_expenses, :operational_state
  end
end
