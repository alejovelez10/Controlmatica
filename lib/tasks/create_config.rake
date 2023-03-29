namespace :create_config do
    desc "Sends the most voted products created yesterday"
    task create: :environment do

        ModuleControl.destroy_all
        
        user = User.last

        rol = Rol.create(name: "Administrador")

        User.all.update(rol_id: rol.id)
        
        providers = ModuleControl.create(name: "Proveedores", user_id: user.id)

        if providers
            AccionModule.create(name: "Ingreso al modulo", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: providers.id, user_id: user.id)
        end

        customers = ModuleControl.create(name: "Clientes", user_id: user.id)

        if customers
            AccionModule.create(name: "Ingreso al modulo", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: customers.id, user_id: user.id)
        end

        parameterizations = ModuleControl.create(name: "Parametrizaciones", user_id: user.id)

        if parameterizations
            AccionModule.create(name: "Ingreso al modulo", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: parameterizations.id, user_id: user.id)
        end
        
        users = ModuleControl.create(name: "Usuarios", user_id: user.id)

        if users
            AccionModule.create(name: "Ingreso al modulo", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: users.id, user_id: user.id)
        end

        rols = ModuleControl.create(name: "Roles", user_id: user.id)

        if rols
            AccionModule.create(name: "Ingreso al modulo", module_control_id: rols.id, user_id: user.id)
            AccionModule.create(name: "Asignar permisos", module_control_id: rols.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: rols.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: rols.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: rols.id, user_id: user.id)
        end

        modulos = ModuleControl.create(name: "Modulos y Acciones", user_id: user.id)

        if modulos
            AccionModule.create(name: "Ingreso al modulo", module_control_id: modulos.id, user_id: user.id)
            AccionModule.create(name: "Gestionar", module_control_id: modulos.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: modulos.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: modulos.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: modulos.id, user_id: user.id)
        end

        cost_center = ModuleControl.create(name: "Centro de Costos", user_id: user.id)

        if cost_center
            AccionModule.create(name: "Ingreso al modulo", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Gestionar modulo", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Finalizar", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Ver horas costo", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Forzar estados", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Finalizar compras", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Editar codigo", module_control_id: cost_center.id, user_id: user.id)
        end

        report = ModuleControl.create(name: "Reportes de servicios", user_id: user.id)

        if report
            AccionModule.create(name: "Ingreso al modulo", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: report.id, user_id: user.id)            
            AccionModule.create(name: "Crear", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Ver Responsables", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Ingresar viaticos", module_control_id: report.id, user_id: user.id)
        end

        customer_reports = ModuleControl.create(name: "Reportes de clientes", user_id: user.id)

        if customer_reports
            AccionModule.create(name: "Ingreso al modulo", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Generar pdf", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Enviar para aprobaciòn", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Editar email", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: customer_reports.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: customer_reports.id, user_id: user.id)
        end

        employed_performance = ModuleControl.create(name: "Informe de rendimiento", user_id: user.id)

        if employed_performance
            AccionModule.create(name: "Ingreso al modulo", module_control_id: employed_performance.id, user_id: user.id)
            AccionModule.create(name: "Ver Responsables", module_control_id: employed_performance.id, user_id: user.id)
        end


        materials = ModuleControl.create(name: "Materiales", user_id: user.id)

        if materials
            AccionModule.create(name: "Ingreso al modulo", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: materials.id, user_id: user.id)

            AccionModule.create(name: "Forzar estados", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: materials.id, user_id: user.id)
        end

        sales_orders = ModuleControl.create(name: "Ordenes de Compra", user_id: user.id)

        if sales_orders
            AccionModule.create(name: "Ingreso al modulo", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Gestionar", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: sales_orders.id, user_id: user.id)
        end

        contractors = ModuleControl.create(name: "Tableristas", user_id: user.id)

        if contractors
            AccionModule.create(name: "Ingreso al modulo", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Descargar excel", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Editar todos", module_control_id: contractors.id, user_id: user.id)
        end

        notification_alert = ModuleControl.create(name: "Notificación de alertas", user_id: user.id)

        if notification_alert
            AccionModule.create(name: "Ingreso al modulo", module_control_id: notification_alert.id, user_id: user.id)
            AccionModule.create(name: "Revisar", module_control_id: notification_alert.id, user_id: user.id)
        end

        register_edit = ModuleControl.create(name: "Registro de edicion", user_id: user.id)

        if register_edit
            AccionModule.create(name: "Ingreso al modulo", module_control_id: register_edit.id, user_id: user.id)
            AccionModule.create(name: "Revisar", module_control_id: register_edit.id, user_id: user.id)
        end

        report_expense = ModuleControl.create(name: "Gastos", user_id: user.id)

        if report_expense
            AccionModule.create(name: "Ingreso al modulo", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: report_expense.id, user_id: user.id)

            AccionModule.create(name: "Aceptar gasto", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Exportar a excel", module_control_id: report_expense.id, user_id: user.id)
            AccionModule.create(name: "Cambiar responsable", module_control_id: report_expense.id, user_id: user.id)
        end

        expense_ratio = ModuleControl.create(name: "Relación de gastos", user_id: user.id)

        if expense_ratio
            AccionModule.create(name: "Ingreso al modulo", module_control_id: expense_ratio.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: expense_ratio.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: expense_ratio.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: expense_ratio.id, user_id: user.id)
            AccionModule.create(name: "Ver pdf", module_control_id: expense_ratio.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: expense_ratio.id, user_id: user.id)
        end

        type_expense = ModuleControl.create(name: "Tipos de Gastos", user_id: user.id)

        if type_expense
            AccionModule.create(name: "Ingreso al modulo", module_control_id: type_expense.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: type_expense.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: type_expense.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: type_expense.id, user_id: user.id)
        end

        commission = ModuleControl.create(name: "Comisiones", user_id: user.id)

        if commission
            AccionModule.create(name: "Ingreso al modulo", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Aceptar comisión", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Exportar a excel", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Cambiar responsable", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Cambiar valor hora", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Editar despues de aceptado", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Eliminar despues de aceptado", module_control_id: commission.id, user_id: user.id)
            AccionModule.create(name: "Forzar horas", module_control_id: commission.id, user_id: user.id)
        end

        commission_relation = ModuleControl.create(name: "Relación de comisiones", user_id: user.id)

        if commission_relation
            AccionModule.create(name: "Ingreso al modulo", module_control_id: commission_relation.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: commission_relation.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: commission_relation.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: commission_relation.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: commission_relation.id, user_id: user.id)
            AccionModule.create(name: "Ver pdf", module_control_id: commission_relation.id, user_id: user.id)
        end


        tablero = ModuleControl.create(name: "Tablero de Ingenieros", user_id: user.id)

        if tablero
            AccionModule.create(name: "Ver tablero", module_control_id: tablero.id, user_id: user.id)
            AccionModule.create(name: "Ver todos", module_control_id: tablero.id, user_id: user.id)
        end


        shift = ModuleControl.create(name: "Turnos", user_id: user.id)

        if shift
            AccionModule.create(name: "Ver tablero", module_control_id: shift.id, user_id: user.id)
        end

        red = ModuleControl.create(name: "Informe de rendimiento tableristas", user_id: user.id)

        if red
            AccionModule.create(name: "Ingreso al modulo", module_control_id: red.id, user_id: user.id)
        end





    
        Parameterization.create(name: "HORA HOMBRE COSTO", money_value: 50000)
        Parameterization.create(name: "HORA HOMBRE COTIZADA", money_value: 80000)
        Parameterization.create(name: "HORA TABLERISTA COSTO", money_value: 50000)
        Parameterization.create(name: "HORA DESPLAZAMIENTO", money_value: 50000)

        Alert.create(
            desp_med: 100, 
            desp_min: 85, 
            ing_costo_med: 25, 
            ing_costo_min: 40, 
            ing_ejecucion_med: 100, 
            ing_ejecucion_min: 85,
            mat_med: 15,
            mat_min: 20,
            name: "ALERTAS",
            tab_costo_med: 15,
            tab_costo_min: 35,
            tab_ejecucion_med: 100,
            tab_ejecucion_min: 85,
            total_med: 15,
            total_min: 20,
            via_med: 100,
            user_id: user.id,
            via_min: 85
        )

    end
end