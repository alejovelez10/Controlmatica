# Permisos del modulo "Reglas de gastos" (paquete 14).
#
# ARCHIVO APARTE Y NO UNA LINEA MAS EN LA RAKE TASK DE PERMISOS DEL PAQUETE 01:
# ese archivo tiene dueno unico (matriz §7.2) y este paquete llego tres olas
# despues. Duplicar seis lineas es mas barato que una edicion cruzada que nadie
# sabe a quien atribuir cuando falle.
#
# Es idempotente y aditiva, igual que su hermana: se puede correr en staging y en
# produccion las veces que haga falta. NO se usa create_config:create, que
# arranca borrando todos los ModuleControl y, siendo HABTM con Rol, se lleva por
# delante todos los permisos de todos los roles.
#
# Uso:  bundle exec rake permissions_expense_rules:install
namespace :permissions_expense_rules do
  desc "Crea (idempotente) el modulo Reglas de gastos con sus 4 acciones y se lo asigna al rol Administrador"
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

    module_name = "Reglas de gastos"
    mc = ModuleControl.find_or_create_by!(name: module_name) { |m| m.user_id = admin.id }

    ["Ingreso al modulo", "Crear", "Editar", "Eliminar"].each do |action_name|
      am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
        a.user_id = admin.id # belongs_to :user es REQUERIDO en AccionModule
      end
      rol_admin.accion_modules << am unless rol_admin.accion_modules.include?(am)
    end

    puts "  #{module_name}: #{mc.accion_modules.count} acciones"
    puts "permissions_expense_rules:install ok. " \
         "ModuleControl=#{ModuleControl.count} AccionModule=#{AccionModule.count} " \
         "permisos_admin=#{rol_admin.reload.accion_modules.count}"
  end
end
