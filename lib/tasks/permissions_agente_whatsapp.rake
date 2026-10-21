# Seccion "Agente de WhatsApp" de la pantalla de Roles (paquete 17, 2026-10-20).
#
# Lo que cada persona puede hacer con el agente lo decide su rol, con dos
# casillas: "Registrar gasto" y "Registrar reporte de servicios". El agente SOLO
# registra; no responde consultas. Sin ninguna de las dos, la persona recibe un
# aviso y el agente no la atiende (Agente::Permisos).
#
# LA PRIMERA VEZ se las asigna solo al rol Administrador, para la prueba piloto;
# los demas roles se habilitan desde la pantalla, a medida que se anuncia el
# numero. Las siguientes veces NO TOCA NINGUN ROL: si alguien quito una casilla
# desde la pantalla, correrla otra vez no la devuelve.
#
# Idempotente y aditiva, como sus hermanas. NO se usa create_config:create, que
# arranca borrando todos los ModuleControl y se lleva por delante todos los
# permisos de todos los roles.
#
# Uso:  bundle exec rake permissions_agente_whatsapp:install
namespace :permissions_agente_whatsapp do
  desc "Crea (idempotente) la seccion 'Agente de WhatsApp' con sus dos acciones y, la primera vez, se las asigna al rol Administrador"
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    abort "No hay ningun usuario con rol 'Administrador'. AccionModule belongs_to :user es requerido: sin admin no se puede sembrar." if admin.nil?

    # Los callbacks de auditoria lo exigen: fuera de un request web User.current
    # es nil y revientan con NoMethodError.
    User.current = admin

    modulo = ModuleControl.find_or_create_by!(name: Agente::Permisos::MODULO) do |m|
      m.description = "Lo que la persona puede registrar por WhatsApp. El agente no responde consultas."
      m.user_id = admin.id
    end

    acciones = [Agente::Permisos::REGISTRAR_GASTO, Agente::Permisos::REGISTRAR_REPORTE].map do |nombre|
      AccionModule.find_or_create_by!(name: nombre, module_control_id: modulo.id) do |a|
        a.user_id = admin.id # belongs_to :user es REQUERIDO
      end
    end

    nuevas = acciones.select(&:previously_new_record?)
    if nuevas.any?
      # TODOS los roles con ese nombre: hay bases (desarrollo) con el rol
      # repetido, y find_by se lo daria solo al primero.
      roles = Rol.where(name: "Administrador").order(:id)
      roles.each do |rol|
        nuevas.each { |accion| rol.accion_modules << accion unless rol.accion_modules.include?(accion) }
      end
      puts "  Acciones creadas y asignadas a Administrador (#{roles.size} rol(es)): #{nuevas.map(&:name).join(', ')}"
    else
      puts "  Las acciones ya existian: no se toco ningun rol."
    end

    acciones.each do |accion|
      puts "  #{accion.name}: #{accion.rols.order(:id).pluck(:name).join(', ').presence || '(ningun rol)'}"
    end
    puts "permissions_agente_whatsapp:install ok."
  end
end
