# La accion de Contabilidad se llamaba "Aprobar" y en la pantalla de Roles no
# decia que aprobaba: al lado de "Ingreso al modulo", "Exportar a excel" y "Ver
# todos", "Aprobar" se podia leer como la aprobacion del gasto (que es de
# Gastos, "Aceptar gasto") y no como la causacion contable. Pasa a llamarse
# "Contabilizar", que es el verbo que usa el resto de esa pantalla
# ("Contabilizado", "Contabilizar seleccionados").
#
# ES UN RENOMBRE DE DATO Y NO DE ESQUEMA: `accion_modules_rols` apunta por id,
# asi que ningun rol pierde el permiso. Lo que si cambia es el string que
# compara `has_menu_permission?`, y por eso el codigo se actualiza en el mismo
# commit: con la migracion corrida y el codigo viejo, contabilidad se quedaria
# sin poder contabilizar.
#
# IDEMPOTENTE Y ACOTADA AL MODULO: se filtra por `module_controls.name` porque
# "Aprobar" podria existir en otro modulo mas adelante; hoy es la unica.
class RenombrarAccionAprobarDeContabilidad < ActiveRecord::Migration[6.1]
  def up
    renombrar("Aprobar", "Contabilizar")
  end

  def down
    renombrar("Contabilizar", "Aprobar")
  end

  private

  def renombrar(desde, hasta)
    execute(<<~SQL)
      UPDATE accion_modules
         SET name = #{ActiveRecord::Base.connection.quote(hasta)},
             updated_at = NOW()
       WHERE name = #{ActiveRecord::Base.connection.quote(desde)}
         AND module_control_id IN (SELECT id FROM module_controls WHERE name = 'Contabilidad')
    SQL
  end
end
