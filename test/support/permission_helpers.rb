# Helpers para manipular permisos (ModuleControl / AccionModule / HABTM con Rol)
# dentro de un test, sin tocar fixtures.
#
# TRAMPA: ApplicationHelper#menu_permissions memoiza en @_menu_permissions POR
# INSTANCIA DE CONTROLLER, o sea por request. Cambiar permisos entre dos requests
# del mismo test funciona; cambiarlos y esperar efecto DENTRO del mismo request,
# no. Los tests otorgan el permiso ANTES de hacer la peticion.
module PermissionHelpers
  # Agrega un permiso a un rol en caliente. Idempotente: llamarlo dos veces no
  # duplica ni el AccionModule ni la fila del HABTM.
  #
  # Firma: grant_permission!(rol, "Presupuesto", "Crear") -> AccionModule
  def grant_permission!(rol, module_name, action_name)
    mc = ModuleControl.find_by!(name: module_name)
    am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
      a.user_id = users(:admin).id
    end
    rol.accion_modules << am unless rol.accion_modules.include?(am)
    am
  end

  # Firma: revoke_permission!(rol, "Presupuesto", "Crear") -> void
  def revoke_permission!(rol, module_name, action_name)
    mc = ModuleControl.find_by(name: module_name)
    return if mc.nil?

    am = AccionModule.find_by(name: action_name, module_control_id: mc.id)
    return if am.nil?

    rol.accion_modules.delete(am)
  end

  # Usuario garantizado sin ningun permiso y sin el rol Administrador.
  #
  # Firma: user_without_permissions -> User
  def user_without_permissions
    users(:sin_permisos)
  end

  # Rol vacio, para probar los gates de 403.
  #
  # Firma: rol_without_permissions -> Rol
  def rol_without_permissions
    rols(:sin_permisos)
  end
end
