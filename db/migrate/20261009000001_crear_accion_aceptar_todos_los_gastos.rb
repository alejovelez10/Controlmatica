# Los dos permisos de aceptar (M4 de las mejoras de octubre, punto 1 de la
# lista del cliente): "debe haber un permiso que es aceptar todos los gastos y
# otro aceptar gastos".
#
#   * `Gastos · Aceptar gasto` (el que ya existe) PASA A SIGNIFICAR "los de los
#     centros a mi cargo y los mios". No se renombra: los roles apuntan por id y
#     lo conservan, pero desde este despliegue alcanza menos.
#   * `Gastos · Aceptar todos los gastos` (esta migracion) acepta cualquiera.
#
# NO SE LE ASIGNA A NINGUN ROL (decision D3, 2026-10-06): lo reparten ellos
# desde la pantalla de Roles. Consecuencia aceptada y que hay que AVISAR antes
# de desplegar: quien hoy acepta gastos ajenos con "Aceptar gasto" deja de
# poder hacerlo hasta que le asignen el permiso nuevo.
#
# ES UNA MIGRACION DE DATO, con el mismo molde que 20260918000001: SQL directo,
# acotada al modulo "Gastos" por subconsulta e idempotente (correrla dos veces
# no crea dos acciones). El codigo que la lee va en el mismo commit: con el
# codigo nuevo y sin la accion, nadie que no sea administrador podria aceptar
# gastos ajenos, y la pantalla de Roles no tendria de donde asignarlo.
#
# `user_id` NO ES DECORATIVO: AccionModule `belongs_to :user` es obligatorio, y
# una accion sin autor no se podria volver a guardar desde la pantalla de Roles.
# Se usa el primer administrador, como hacen las tasks de permisos.
class CrearAccionAceptarTodosLosGastos < ActiveRecord::Migration[6.1]
  NOMBRE = "Aceptar todos los gastos".freeze
  DESCRIPCION = "Acepta y rechaza gastos de cualquier centro de costo y de cualquier responsable. " \
                "Sin este permiso, \"Aceptar gasto\" solo alcanza los gastos propios y los de los centros a cargo.".freeze

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

  # Se borran tambien las asignaciones: un `accion_modules_rols` apuntando a una
  # accion que no existe es una fila huerfana que la pantalla de Roles no sabe
  # pintar.
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
