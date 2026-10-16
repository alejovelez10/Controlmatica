# Casilla "Puede ser propietario" del modulo Centro de Costos (2026-10-16).
#
# Quien podia ser PROPIETARIO de un centro lo decidia una lista de nombres de
# rol escrita en el codigo (ApplicationHelper::ROLES_PROPIETARIOS): habilitar a
# alguien nuevo exigia un deploy. Desde ahora lo decide esta casilla en la
# pantalla de Roles, y el select del formulario del centro solo ofrece a los
# usuarios cuyo rol la tenga (User.pueden_ser_propietarios).
#
# LA PRIMERA VEZ se la asigna a los roles de esa lista, para que el select
# ofrezca a las mismas personas que antes del cambio: sin eso, el dia del deploy
# el select amaneceria vacio. Las siguientes veces NO TOCA NINGUN ROL: si
# alguien le quito la casilla a un rol desde la pantalla, correrla otra vez no
# se la devuelve.
#
# Idempotente y aditiva, como sus hermanas. NO se usa create_config:create, que
# arranca borrando todos los ModuleControl y se lleva por delante todos los
# permisos de todos los roles.
#
# Uso:  bundle exec rake permissions_propietario_centro:install
namespace :permissions_propietario_centro do
  desc "Crea (idempotente) la accion 'Puede ser propietario' en Centro de Costos y, la primera vez, se la asigna a los roles que hoy son propietarios"
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    abort "No hay ningun usuario con rol 'Administrador'. AccionModule belongs_to :user es requerido: sin admin no se puede sembrar." if admin.nil?

    # Los callbacks de auditoria lo exigen: fuera de un request web User.current
    # es nil y revientan con NoMethodError.
    User.current = admin

    # find_by y no find_or_create_by: el modulo existe desde siempre en todas
    # las bases. Si no esta, algo anda mal y crear uno nuevo lo esconderia.
    mc = ModuleControl.find_by(name: CostCenter::MODULO_PERMISOS)
    abort "No existe el modulo '#{CostCenter::MODULO_PERMISOS}'." if mc.nil?

    accion = AccionModule.find_or_create_by!(name: CostCenter::ACCION_PUEDE_SER_PROPIETARIO,
                                             module_control_id: mc.id) do |a|
      a.user_id = admin.id # belongs_to :user es REQUERIDO
    end

    if accion.previously_new_record?
      roles = Rol.where("LOWER(rols.name) IN (?)", ApplicationHelper::ROLES_PROPIETARIOS).order(:id)
      roles.each { |rol| rol.accion_modules << accion unless rol.accion_modules.include?(accion) }
      puts "  Accion creada y asignada a: #{roles.map(&:name).join(', ').presence || '(ningun rol)'}"
    else
      puts "  La accion ya existia: no se toco ningun rol."
    end

    puts "  Roles con la casilla: #{accion.rols.order(:id).pluck(:name).join(', ').presence || '(ninguno)'}"
    puts "  Usuarios que pueden ser propietarios: #{User.pueden_ser_propietarios.count}"

    # Informativo: esos centros NO cambian. El select sigue mostrando a su
    # propietario actual; solo que, si se cambia, no se le puede volver a elegir.
    sin_casilla = CostCenter.where.not(user_owner_id: nil)
                            .where.not(user_owner_id: User.pueden_ser_propietarios.select(:id))
                            .count
    puts "  Centros cuyo propietario actual NO tiene la casilla: #{sin_casilla}"
    puts "permissions_propietario_centro:install ok."
  end
end
