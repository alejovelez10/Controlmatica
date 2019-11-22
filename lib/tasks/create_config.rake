namespace :create_config do
    desc "Sends the most voted products created yesterday"
    task create: :environment do

        ModuleControl.destroy_all
        
        user = User.find_by_email("alejovelez10@gmail.com")

        providers = ModuleControl.create(name: "Proveedores", user_id: user.id)

        if providers
            AccionModule.create(name: "Ingreso al modulo", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: providers.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: providers.id, user_id: user.id)
        end

        customers = ModuleControl.create(name: "Clientes", user_id: user.id)

        if customers
            AccionModule.create(name: "Ingreso al modulo", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: customers.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: customers.id, user_id: user.id)
        end

        parameterizations = ModuleControl.create(name: "Parametrizaciones", user_id: user.id)

        if parameterizations
            AccionModule.create(name: "Ingreso al modulo", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: parameterizations.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: parameterizations.id, user_id: user.id)
        end
        
        users = ModuleControl.create(name: "Usuarios", user_id: user.id)

        if users
            AccionModule.create(name: "Ingreso al modulo", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: users.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: users.id, user_id: user.id)
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
            AccionModule.create(name: "Crear", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: cost_center.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: cost_center.id, user_id: user.id)
        end

        report = ModuleControl.create(name: "Reportes de servicios", user_id: user.id)

        if report
            AccionModule.create(name: "Ingreso al modulo", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: report.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: report.id, user_id: user.id)
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
        end

        employed_performance = ModuleControl.create(name: "Informe de rendimiento", user_id: user.id)

        if employed_performance
            AccionModule.create(name: "Ingreso al modulo", module_control_id: employed_performance.id, user_id: user.id)
        end

        contractors = ModuleControl.create(name: "Contratistas", user_id: user.id)

        if contractors
            AccionModule.create(name: "Ingreso al modulo", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: contractors.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: contractors.id, user_id: user.id)
        end


        materials = ModuleControl.create(name: "Materiales", user_id: user.id)

        if materials
            AccionModule.create(name: "Ingreso al modulo", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: materials.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: materials.id, user_id: user.id)
        end

        sales_orders = ModuleControl.create(name: "Ordenes de Compra", user_id: user.id)

        if sales_orders
            AccionModule.create(name: "Ingreso al modulo", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Gestionar", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Crear", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Eliminar", module_control_id: sales_orders.id, user_id: user.id)
            AccionModule.create(name: "Editar", module_control_id: sales_orders.id, user_id: user.id)
        end


    end
end