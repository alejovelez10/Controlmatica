# frozen_string_literal: true

require "test_helper"

# Lo que cada persona puede hacer con el agente, segun su rol (paquete 17).
class Agente::PermisosTest < ActiveSupport::TestCase
  def rol_con(*acciones)
    Rol.create!(name: "Rol #{SecureRandom.hex(3)}", accion_modules: acciones.map { |a| accion_modules(a) })
  end

  def usuario_con(rol)
    users(:ingeniero_dos).tap { |u| u.update_columns(rol_id: rol.id) }
  end

  test "con las dos casillas registra gastos y reportes" do
    permisos = Agente::Permisos.para(users(:ingeniero))
    assert permisos.registrar_gasto?
    assert permisos.registrar_reporte?
    assert permisos.alguno?
  end

  test "sin ninguna casilla no puede usar el agente" do
    refute Agente::Permisos.para(users(:sin_permisos)).alguno?
  end

  test "Administrador no es un bypass: sin la casilla tampoco lo usa" do
    refute Agente::Permisos.para(users(:admin)).alguno?
  end

  test "Gastos > Crear de la web no habilita el agente: la seccion es aparte" do
    usuario = usuario_con(rol_con(:gastos_ingreso, :gastos_crear))
    refute Agente::Permisos.para(usuario).registrar_gasto?
  end

  test "con una sola casilla las herramientas son solo las de eso" do
    gasto = Agente::Permisos.para(usuario_con(rol_con(:agente_registrar_gasto)))
    nombres = Agente::Herramientas.definiciones(gasto).map { |d| d["name"] }
    assert_includes nombres, "proponer_gasto"
    assert_includes nombres, "report_expense_options_list"
    refute_includes nombres, "proponer_reporte"
    refute_includes nombres, "contacts_list"
    refute_includes nombres, "propietarios_list"

    reporte = Agente::Permisos.para(usuario_con(rol_con(:agente_registrar_reporte)))
    nombres = Agente::Herramientas.definiciones(reporte).map { |d| d["name"] }
    assert_includes nombres, "proponer_reporte"
    assert_includes nombres, "contacts_list"
    assert_includes nombres, "propietarios_list"
    refute_includes nombres, "proponer_gasto"
    refute_includes nombres, "adjuntar_comprobante"
  end

  test "los viaticos siguen la regla de la web: Administrador o Ingresar viaticos" do
    refute Agente::Permisos.para(users(:ingeniero)).ingresar_viaticos?
    assert Agente::Permisos.para(users(:admin)).ingresar_viaticos?

    accion = AccionModule.create!(name: "Ingresar viaticos", module_control: module_controls(:reportes),
                                  user: users(:admin))
    usuario = usuario_con(Rol.create!(name: "Con viaticos", accion_modules: [accion]))
    assert Agente::Permisos.para(usuario).ingresar_viaticos?
  end
end
