# Permiso para ver la pestaña «Incumplen reglas» de Gastos (2026-10-28, pedido
# del usuario: "debe tener un permiso de ver esa lista o no en el item de
# gastos en roles").
#
# Hasta hoy la pestaña la veia quien tuviera «Ver todos», fuera propietario de
# un centro o segundo aprobador. Desde este despliegue la ve SOLO quien tenga
# `Gastos · Ver reglas incumplidas` (y el administrador, como en todo Gastos).
# Lo que ve adentro no cambia: con «Ver todos», todo; sin el, lo suyo, lo de
# sus centros y lo que espera su segunda firma.
#
# NO SE LE ASIGNA A NINGUN ROL, igual que «Aceptar todos los gastos»
# (20261009000001): lo reparten desde la pantalla de Roles. Mientras tanto la
# pestaña solo la ve el administrador.
#
# Mismo molde que 20261009000001: SQL directo, acotada al modulo "Gastos" e
# idempotente. `user_id` es obligatorio en AccionModule.
class CrearAccionVerReglasIncumplidas < ActiveRecord::Migration[6.1]
  NOMBRE = "Ver reglas incumplidas".freeze
  DESCRIPCION = "Ve la pestaña «Incumplen reglas» de Gastos: los gastos que se guardaron incumpliendo alguna " \
                "regla, con la razón y quién los aprobó. Con «Ver todos» ve los de todos; sin él, los suyos, " \
                "los de los centros a su cargo y los que esperan su segunda aprobación.".freeze

  def up
    nombre = quote(NOMBRE)

    execute(<<~SQL)
      INSERT INTO accion_modules (name, description, user_id, module_control_id, created_at, updated_at)
      SELECT #{nombre}, #{quote(DESCRIPCION)},
             COALESCE(
               (SELECT users.id FROM users JOIN rols ON rols.id = users.rol_id
                 WHERE rols.name = 'Administrador' ORDER BY users.id LIMIT 1),
               (SELECT id FROM users ORDER BY id LIMIT 1)
             ),
             module_controls.id, NOW(), NOW()
        FROM module_controls
       WHERE module_controls.name = 'Gastos'
         AND NOT EXISTS (
               SELECT 1 FROM accion_modules
                WHERE accion_modules.name = #{nombre}
                  AND accion_modules.module_control_id = module_controls.id
             )
    SQL
  end

  def down
    ids = <<~SQL
      SELECT accion_modules.id FROM accion_modules
        JOIN module_controls ON module_controls.id = accion_modules.module_control_id
       WHERE module_controls.name = 'Gastos' AND accion_modules.name = #{quote(NOMBRE)}
    SQL

    execute("DELETE FROM accion_modules_rols WHERE accion_module_id IN (#{ids})")
    execute("DELETE FROM accion_modules WHERE id IN (#{ids})")
  end

  private

  def quote(valor)
    ActiveRecord::Base.connection.quote(valor)
  end
end
