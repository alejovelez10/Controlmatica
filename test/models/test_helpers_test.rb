require "test_helper"

# Prueba los helpers que este paquete deja para los 11 paquetes siguientes.
# No prueba logica de negocio: todavia no existe.
class TestHelpersTest < ActiveSupport::TestCase
  test "as_user setea User.current durante el bloque" do
    as_user(users(:admin)) do
      assert_equal users(:admin), User.current
    end
  end

  test "as_user restaura el valor previo al salir" do
    User.current = users(:gerente)
    as_user(users(:admin)) { nil }
    assert_equal users(:gerente), User.current
  end

  test "as_user restaura User.current aunque el bloque lance" do
    # Caso de fallo, no camino feliz: sin el `ensure`, User.current queda
    # contaminado y el siguiente test del mismo hilo falla por accidente.
    assert_raises(RuntimeError) do
      as_user(users(:admin)) { raise "boom" }
    end
    assert_nil User.current
  end

  test "crear un ReportExpense dentro de as_user no revienta y deja RegisterEdit" do
    antes = RegisterEdit.where(module: "Gatos").count # el typo se conserva a proposito

    gasto = as_user(users(:admin)) do
      ReportExpense.create!(
        user_id: users(:admin).id,
        user_invoice_id: users(:ingeniero).id,
        cost_center_id: cost_centers(:centro_con_viaticos).id,
        invoice_name: "Hotel de prueba",
        invoice_date: Date.new(2026, 6, 15),
        invoice_number: "FE-TEST-001",
        invoice_value: 100_000.0,
        invoice_tax: 19_000.0,
        invoice_total: 119_000.0
      )
    end

    assert ReportExpense.exists?(gasto.id)
    assert_equal antes + 1, RegisterEdit.where(module: "Gatos").count
  end

  test "crear un ReportExpense sin User.current usa el fallback current_actor_id" do
    # Este es el test que valida ReportExpense#current_actor_id. Antes de el,
    # esto reventaba con "undefined method `id' for nil".
    User.current = nil

    gasto = ReportExpense.create!(
      user_id: users(:admin).id,
      user_invoice_id: users(:ingeniero).id,
      cost_center_id: cost_centers(:centro_con_viaticos).id,
      invoice_name: "Gasto sin actor",
      invoice_date: Date.new(2026, 6, 16),
      invoice_number: "FE-TEST-002",
      invoice_value: 50_000.0,
      invoice_tax: 0.0,
      invoice_total: 50_000.0
    )

    registro = RegisterEdit.where(register_user_id: gasto.id, module: "Gatos").last
    assert_not_nil registro, "create_create_register no dejo rastro de auditoria"
    assert_equal users(:admin).id, registro.user_id
  end

  test "grant_permission! agrega el permiso y revoke_permission! lo quita" do
    rol = rols(:ingeniero)
    mc = ModuleControl.find_by!(name: "Presupuesto de gastos")

    grant_permission!(rol, "Presupuesto de gastos", "Crear")
    assert rol.reload.accion_modules.exists?(name: "Crear", module_control_id: mc.id)

    # Idempotente: dos veces no duplica la fila del HABTM.
    grant_permission!(rol, "Presupuesto de gastos", "Crear")
    assert_equal 1, rol.reload.accion_modules.where(name: "Crear", module_control_id: mc.id).count

    revoke_permission!(rol, "Presupuesto de gastos", "Crear")
    assert_not rol.reload.accion_modules.exists?(name: "Crear", module_control_id: mc.id)
  end

  test "upload_fixture devuelve un UploadedFile con el content type correcto" do
    assert_equal "application/pdf", upload_fixture("comprobante.pdf").content_type
    assert_equal "application/octet-stream", upload_fixture("malicioso.exe").content_type
  end
end
