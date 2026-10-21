module Agente
  # Lo que cada persona puede hacer con el agente (paquete 17). Sale de su rol:
  # la seccion "Agente de WhatsApp" de la pantalla de Roles, que se crea con
  # `rake permissions_agente_whatsapp:install`.
  #
  # El agente SOLO registra: no responde consultas. Sin ninguna de las dos
  # acciones, la persona no puede usarlo.
  #
  # Aqui el rol Administrador NO es un bypass (como en Presupuesto de gastos):
  # si se le quita la casilla en la pantalla, deja de poder usar el agente.
  class Permisos
    MODULO = "Agente de WhatsApp".freeze
    REGISTRAR_GASTO = "Registrar gasto".freeze
    REGISTRAR_REPORTE = "Registrar reporte de servicios".freeze

    # Los viaticos de un reporte siguen la misma regla de la web
    # (ReportsController#estados): Administrador o "Ingresar viaticos".
    MODULO_REPORTES = "Reportes de servicios".freeze
    INGRESAR_VIATICOS = "Ingresar viaticos".freeze

    def self.para(usuario)
      new(usuario)
    end

    def initialize(usuario)
      @rol = usuario&.rol
      @acciones = if @rol
                    @rol.accion_modules.joins(:module_control).pluck("module_controls.name", "accion_modules.name")
                  else
                    []
                  end
    end

    def registrar_gasto?
      tiene?(MODULO, REGISTRAR_GASTO)
    end

    def registrar_reporte?
      tiene?(MODULO, REGISTRAR_REPORTE)
    end

    def alguno?
      registrar_gasto? || registrar_reporte?
    end

    def ingresar_viaticos?
      @rol&.name == "Administrador" || tiene?(MODULO_REPORTES, INGRESAR_VIATICOS)
    end

    # Para el bloque [Contexto] del primer mensaje: el modelo sabe que puede
    # proponer y que tiene que contestar si le piden lo otro.
    def descripcion
      lineas = []
      lineas << "Esta persona puede registrar: #{[('gastos' if registrar_gasto?),
                                                    ('reportes de servicio' if registrar_reporte?)].compact.join(' y ')}."
      lineas << "NO puede registrar gastos: si lo pide, dile que su rol no lo tiene habilitado." unless registrar_gasto?
      unless registrar_reporte?
        lineas << "NO puede registrar reportes de servicio: si lo pide, dile que su rol no lo tiene habilitado."
      end
      if registrar_reporte? && !ingresar_viaticos?
        lineas << "No registra viáticos en los reportes: no los pidas y propón viatic_value 0."
      end
      lineas.join(" ")
    end

    private

    def tiene?(modulo, accion)
      @acciones.include?([modulo, accion])
    end
  end
end
