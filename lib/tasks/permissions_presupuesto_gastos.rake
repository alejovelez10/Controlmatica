# Permisos del modulo "Presupuesto de gastos".
#
# POR QUE UN MODULO PROPIO Y NO ACCIONES DENTRO DE "Centro de Costos":
# aunque el presupuesto se administre desde una pestana del centro, sus permisos
# son un cuerpo aparte (ver / crear / editar / eliminar / ver los de todos) y
# mezclarlos con las 13 acciones que ya tiene Centro de Costos obligaba a
# nombres largos y redundantes ("Ver presupuesto de gastos" dentro de un modulo
# que ya se llama asi). Con modulo propio las acciones se llaman igual que en el
# resto de la aplicacion.
#
# POR QUE NO SE USA create_config:create:
# esa task arranca borrando en bloque todos los ModuleControl y, siendo HABTM con
# Rol, se lleva por delante TODAS las acciones y TODOS los permisos de TODOS los
# roles. Correrla con datos es irreversible. Esta es idempotente y aditiva: se
# puede correr las veces que haga falta, en cualquier entorno.
#
# OJO: el rol Administrador NO se salta estos permisos (a diferencia del resto de
# la app). Ver el comentario en ExpenseBudgetsController#budget_permission?. Por
# eso esta task se los asigna explicitamente: sin correrla, un admin recibe 403.
#
# Uso:
#   bundle exec rake permissions_presupuesto:install   # siembra y asigna al Administrador
#   bundle exec rake permissions_presupuesto:report    # solo muestra el estado, no escribe

# Envuelto en un modulo a proposito: definir constantes sueltas dentro de un
# bloque `namespace` de Rake las cuelga de Object, y al cargarse el archivo mas
# de una vez en el mismo proceso salen los `already initialized constant` que
# ensucian la salida de la suite (pendiente P-21 del plan).
module PermisosPresupuesto
  MODULO = "Presupuesto de gastos".freeze # literal y case-sensitive

  # El orden importa: es el que se ve en la pantalla de Roles.
  ACCIONES = ["Ingreso al modulo", "Crear", "Editar", "Eliminar", "Ver todos"].freeze

  # Nombres largos que sembro una version anterior de esta task DENTRO de
  # "Centro de Costos". Ya no los lee nadie; se limpian para que no queden
  # casillas huerfanas en la pantalla de Roles.
  OBSOLETAS_EN_CENTRO = [
    "Ver presupuesto de gastos",
    "Crear presupuesto de gastos",
    "Editar presupuesto de gastos",
    "Eliminar presupuesto de gastos",
    "Ver presupuesto de todos"
  ].freeze
end

namespace :permissions_presupuesto do
  desc "Crea (idempotente) el modulo 'Presupuesto de gastos' con sus 5 acciones y se las asigna al rol Administrador"
  task install: :environment do
    admin = User.joins(:rol).where(rols: { name: "Administrador" }).order(:id).first
    abort "No hay ningun usuario con rol 'Administrador'. AccionModule belongs_to :user es requerido: sin admin no se puede sembrar." if admin.nil?

    # Los callbacks de auditoria lo exigen: fuera de un request web User.current
    # es nil y revientan con NoMethodError.
    User.current = admin

    rol_admin = Rol.find_by(name: "Administrador") # literal: 'ADMINISTRADOR' en mayusculas NUNCA es admin
    abort "No existe el rol 'Administrador'." if rol_admin.nil?

    mc = ModuleControl.find_or_create_by!(name: PermisosPresupuesto::MODULO) do |m|
      m.user_id = admin.id
      m.description = "Partidas presupuestales por centro de costos y usuario"
    end

    creadas = 0
    asignadas = 0

    PermisosPresupuesto::ACCIONES.each do |action_name|
      am = AccionModule.find_or_create_by!(name: action_name, module_control_id: mc.id) do |a|
        a.user_id = admin.id # belongs_to :user es REQUERIDO
        creadas += 1
      end

      unless rol_admin.accion_modules.include?(am)
        rol_admin.accion_modules << am
        asignadas += 1
      end
    end

    puts "#{PermisosPresupuesto::MODULO}: #{PermisosPresupuesto::ACCIONES.size} acciones " \
         "(#{creadas} creadas, #{PermisosPresupuesto::ACCIONES.size - creadas} ya existian)"
    puts "Rol Administrador: #{asignadas} permisos nuevos asignados"

    limpiar_obsoletas_de_centro_de_costos

    Rake::Task["permissions_presupuesto:report"].invoke
  end

  desc "Muestra que acciones de presupuesto existen y que roles las tienen (no escribe nada)"
  task report: :environment do
    mc = ModuleControl.find_by(name: PermisosPresupuesto::MODULO)
    abort "No existe el ModuleControl '#{PermisosPresupuesto::MODULO}'. Corre permissions_presupuesto:install." if mc.nil?

    puts
    puts "-- #{PermisosPresupuesto::MODULO} --"
    PermisosPresupuesto::ACCIONES.each do |action_name|
      am = AccionModule.find_by(name: action_name, module_control_id: mc.id)
      if am.nil?
        puts format("  %-20s FALTA", action_name)
      else
        roles = am.rols.order(:name).pluck(:name)
        puts format("  %-20s ok  roles: %s", action_name, roles.any? ? roles.join(", ") : "(ninguno)")
      end
    end
  end

  # Borra las acciones de nombre largo que quedaron colgando de "Centro de
  # Costos". Destruir un AccionModule se lleva sus filas del HABTM, que es lo que
  # se quiere: son permisos que ya no controlan nada.
  def limpiar_obsoletas_de_centro_de_costos
    centro = ModuleControl.find_by(name: "Centro de Costos")
    return if centro.nil?

    obsoletas = AccionModule.where(module_control_id: centro.id,
                                   name: PermisosPresupuesto::OBSOLETAS_EN_CENTRO)
    return if obsoletas.empty?

    nombres = obsoletas.pluck(:name)
    obsoletas.destroy_all
    puts "Limpieza: se quitaron #{nombres.size} acciones obsoletas de 'Centro de Costos' (#{nombres.join(', ')})"
  end
end
