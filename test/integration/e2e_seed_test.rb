require "test_helper"

# Guarda del seed de la suite E2E (paquete 12, tareas 1 a 6).
#
# No duplica logica de negocio —eso vive en los paquetes duenos—: protege lo
# unico que no tiene otra red de seguridad, que es el propio andamiaje de datos.
# El test que mas importa es "no toca datos fuera de su alcance": es el que
# impide que alguien meta un `delete_all` sin `where` en el seed y borre la base
# de test de otro desarrollador.
#
# El seed corre dentro de la transaccion del test, asi que todo lo que escribe en
# la BD se revierte al terminar. Lo unico que NO se revierte es
# test/e2e/.auth/seed-ids.json, que es un archivo: por eso se respalda y se
# restaura en setup/teardown. Sin eso, correr Minitest dejaria ese archivo con
# los ids de las fixtures y la siguiente corrida de Playwright buscaria centros
# que no existen.
class E2eSeedTest < ActionDispatch::IntegrationTest
  SEED = Rails.root.join("db", "seeds", "e2e.rb").freeze
  IDS  = Rails.root.join("test", "e2e", ".auth", "seed-ids.json").freeze

  # Los 6 correos que el seed crea. NO se puede afirmar contra
  # `User.where("email LIKE '%@controlmatica.test'")` como pedia el plan: las 10
  # fixtures de users.yml (paquete 01) usan ese mismo dominio, asi que ese
  # contador da 16 en la suite de Minitest aunque el seed este perfecto. La
  # intencion del criterio —"no duplica"— se conserva enumerando los correos.
  EMAILS_E2E = %w[
    e2e@controlmatica.test
    e2e-a@controlmatica.test
    e2e-b@controlmatica.test
    e2e-c@controlmatica.test
    e2e-limitado@controlmatica.test
    e2e-contab@controlmatica.test
  ].freeze

  setup do
    @ids_previos = IDS.exist? ? IDS.read : nil
    @scope_previo = ENV["E2E_SCOPE"]
  end

  teardown do
    if @ids_previos
      File.write(IDS, @ids_previos)
    else
      FileUtils.rm_f(IDS)
    end

    ENV["E2E_SCOPE"] = @scope_previo
    ENV.delete("E2E_SCOPE") if @scope_previo.nil?
  end

  test "el seed e2e es idempotente y no duplica registros" do
    as_user(users(:admin)) do
      2.times do |vuelta|
        load SEED

        assert_equal 7, CostCenter.where("code LIKE 'CM-E2E-%'").count,
                     "vuelta #{vuelta + 1}: deben quedar exactamente 7 centros E2E"
        assert_equal 6, User.where(email: EMAILS_E2E).count,
                     "vuelta #{vuelta + 1}: deben quedar exactamente 6 usuarios E2E"

        pag = CostCenter.find_by(code: "CM-E2E-PAG-2026")
        assert_equal 57, ReportExpense.where(cost_center_id: pag.id).count,
                     "vuelta #{vuelta + 1}: el centro de paginacion debe tener 57 gastos"
      end
    end
  end

  test "el seed e2e no toca datos fuera de su alcance" do
    centros_ajenos = CostCenter.where.not("code LIKE 'CM-E2E-%'").count
    usuarios_ajenos = User.where.not(email: EMAILS_E2E).count
    gastos_ajenos = ReportExpense.joins(:cost_center)
                                .where.not(cost_centers: { code: CostCenter.where("code LIKE 'CM-E2E-%'").pluck(:code) })
                                .count

    as_user(users(:admin)) { load SEED }

    assert_equal centros_ajenos, CostCenter.where.not("code LIKE 'CM-E2E-%'").count,
                 "el seed borro o creo centros fuera de CM-E2E-*"
    assert_equal usuarios_ajenos, User.where.not(email: EMAILS_E2E).count,
                 "el seed borro o creo usuarios fuera de los 6 correos E2E"
    assert_equal gastos_ajenos,
                 ReportExpense.joins(:cost_center)
                              .where.not(cost_centers: { code: CostCenter.where("code LIKE 'CM-E2E-%'").pluck(:code) })
                              .count,
                 "el seed toco gastos de centros ajenos"
  end

  test "el seed e2e fija los codigos de centro pese al callback create_code" do
    as_user(users(:admin)) { load SEED }

    %w[CM-E2E-01-2026 CM-E2E-BUD-2026 CM-E2E-REC-2026 CM-E2E-FX-2026
       CM-E2E-ACC-2026 CM-E2E-PERM-2026 CM-E2E-PAG-2026].each do |code|
      assert_not_nil CostCenter.find_by(code: code),
                     "#{code} no existe: before_create :create_code sobrescribio el codigo"
    end
  end

  test "el seed e2e deja 12 gastos de contabilidad con los estados exactos" do
    as_user(users(:admin)) { load SEED }

    acc = CostCenter.find_by(code: "CM-E2E-ACC-2026")
    gastos = ReportExpense.where(cost_center_id: acc.id)

    assert_equal 12, gastos.count
    assert_equal 8, gastos.where(budget_status: "aprobado").count
    assert_equal 3, gastos.where(budget_status: "sin_presupuesto").count
    assert_equal 1, gastos.where(budget_status: "excedido").count
    assert_equal 12, gastos.where(accounting_approved: false).count

    excedido = gastos.find_by(budget_status: "excedido")
    assert_equal "FE-E2E-ACC-012", excedido.invoice_number
    assert excedido.budget_reason.present?, "el excedido debe traer el motivo visible"
  end

  test "el seed e2e crea el rol Limitado E2E sin permisos de Presupuesto ni Contabilidad" do
    as_user(users(:admin)) { load SEED }

    rol = Rol.find_by(name: "Limitado E2E")
    assert_not_nil rol
    assert_not_equal "Administrador", rol.name,
                     "un rol Administrador saltaria los permisos y el escenario 8 seria un falso verde"
    assert_equal 0,
                 rol.accion_modules.joins(:module_control)
                    .where(module_controls: { name: %w[Presupuesto Contabilidad] }).count
  end

  test "el seed e2e crea el rol Contable E2E que entra a Contabilidad pero no aprueba ni exporta" do
    as_user(users(:admin)) { load SEED }

    rol = Rol.find_by(name: "Contable E2E")
    assert_not_nil rol
    assert_not_equal "Administrador", rol.name

    contabilidad = rol.accion_modules.joins(:module_control)
                      .where(module_controls: { name: "Contabilidad" })
    assert_equal 1, contabilidad.count, "solo puede tener UNA accion de Contabilidad"
    assert_equal "Ingreso al modulo", contabilidad.first.name
    assert_equal 0,
                 rol.accion_modules.joins(:module_control)
                    .where(module_controls: { name: "Presupuesto" }).count
  end

  test "el seed e2e exporta seed-ids.json con todas las claves" do
    as_user(users(:admin)) { load SEED }

    assert IDS.exist?, "falta test/e2e/.auth/seed-ids.json"
    payload = JSON.parse(IDS.read)

    %w[users cost_centers budgets expenses].each { |k| assert payload.key?(k), "falta la clave #{k}" }
    assert_equal 57, payload["expenses"]["PAG"].length
    assert_equal 12, payload["expenses"]["ACC"].length

    planos = payload["users"].values + payload["cost_centers"].values + payload["budgets"].values +
             payload["expenses"].values.flatten
    planos.each do |id|
      assert_kind_of Integer, id
      assert id.positive?, "id no positivo en seed-ids.json: #{id}"
    end
  end

  test "el seed e2e aborta con un E2E_SCOPE desconocido y no escribe nada" do
    centros_antes = CostCenter.count

    ENV["E2E_SCOPE"] = "NOEXISTE"
    assert_raises(SystemExit) { as_user(users(:admin)) { load SEED } }

    assert_equal centros_antes, CostCenter.count,
                 "un scope invalido no puede dejar datos a medias"
  end
end
