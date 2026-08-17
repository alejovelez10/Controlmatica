# Permisos de los modulos nuevos del proyecto de gastos/presupuesto/IA.
#
# POR QUE EXISTE ESTA TASK Y NO SE USA create_config:create:
# create_config:create arranca borrando en bloque todos los ModuleControl y,
# siendo HABTM con Rol, se lleva por delante TODAS las acciones y TODOS los
# permisos asignados a TODOS los roles. Correrla en un entorno con datos es
# irreversible. Esta task es idempotente y aditiva: se puede correr en staging y
# en produccion las veces que haga falta.
#
# Uso:  bundle exec rake permissions_gastos_ia:install
namespace :permissions_gastos_ia do
  desc "Crea (idempotente) los modulos Presupuesto y Contabilidad con sus acciones y se los asigna al rol Administrador"
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first

    if admin.nil?
      abort "No hay ningun usuario con rol 'Administrador'. AccionModule belongs_to :user es requerido: sin admin no se puede sembrar."
    end

    # Los callbacks de auditoria lo exigen: fuera de un request web
    # User.current es nil y revientan con NoMethodError.
    User.current = admin

    rol_admin = Rol.find_by(name: "Administrador") # literal y case-sensitive
    if rol_admin.nil?
      abort "No existe el rol 'Administrador' (ojo: db/seeds_staging.rb siembra 'ADMINISTRADOR' en mayusculas, que NUNCA es admin)."
    end

    {
      "Presupuesto de gastos"  => ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"],
      "Contabilidad" => ["Ingreso al modulo", "Aprobar", "Exportar a excel", "Ver todos"]
    }.each do |module_name, actions|
      mc = ModuleControl.find_or_create_by!(name: module_name) { |m| m.user_id = admin.id }

      actions.each do |action_name|
        am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
          a.user_id = admin.id # belongs_to :user es REQUERIDO en AccionModule
        end
        rol_admin.accion_modules << am unless rol_admin.accion_modules.include?(am)
      end

      puts "  #{module_name}: #{mc.accion_modules.count} acciones"
    end

    puts "permissions_gastos_ia:install ok. " \
         "ModuleControl=#{ModuleControl.count} AccionModule=#{AccionModule.count} " \
         "permisos_admin=#{rol_admin.reload.accion_modules.count}"
  end
end
