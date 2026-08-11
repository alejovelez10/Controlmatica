require "test_helper"

# Test guardian de `fixtures :all`.
#
# Razon de existir: un solo YAML roto tumba la suite ENTERA, no solo su propio
# test, y el error que Rails escupe no dice cual archivo fue. Estos 8 casos
# fallan primero y con el nombre del archivo, en vez de dejar 60 tests ajenos en
# rojo con un NoMethodError criptico.
#
# Todo paquete que agregue una fixture corre `bin/rails test test/models` COMPLETO
# antes de mergear.
class FixturesIntegrityTest < ActiveSupport::TestCase
  # YAML de test/fixtures que no corresponden a un modelo del proyecto.
  SIN_MODELO = [].freeze

  def modelos_de_fixtures
    Dir[Rails.root.join("test/fixtures/*.yml")].sort.filter_map do |ruta|
      nombre = File.basename(ruta, ".yml")
      next if SIN_MODELO.include?(nombre)

      modelo = nombre.classify.safe_constantize
      next unless modelo.is_a?(Class) && modelo < ActiveRecord::Base

      [nombre, modelo, ruta]
    end
  end

  test "todas las fixtures cargan sin error" do
    vacias = modelos_de_fixtures.reject { |_nombre, modelo, _ruta| modelo.count.positive? }
                                .map(&:first)
    assert_empty vacias,
                 "Estos YAML de fixtures no dejaron ni un registro en la BD: #{vacias.join(", ")}"
  end

  test "ninguna columna de fixture es inexistente en el esquema" do
    errores = []

    modelos_de_fixtures.each do |nombre, modelo, ruta|
      permitidas = modelo.column_names +
                   modelo.reflect_on_all_associations.map { |a| a.name.to_s }
      # permitted_classes: los YAML traen fechas sin comillas (2026-01-15) y
      # Psych 4 las rechaza por defecto con DisallowedClass.
      registros = YAML.load(ERB.new(File.read(ruta)).result,
                            aliases: true,
                            permitted_classes: [Date, Time, Symbol]) || {}
      next unless registros.is_a?(Hash)

      registros.each do |etiqueta, atributos|
        next unless atributos.is_a?(Hash)

        atributos.each_key do |clave|
          next if permitidas.include?(clave.to_s)

          errores << "#{nombre}.yml -> #{etiqueta}: la clave '#{clave}' no es " \
                     "columna ni asociacion de #{modelo.name}"
        end
      end
    end

    assert_empty errores, errores.join("\n")
  end

  test "las FKs de report_expenses apuntan a registros existentes" do
    assert ReportExpense.count.positive?, "report_expenses.yml quedo sin registros"

    ReportExpense.find_each do |gasto|
      assert CostCenter.exists?(gasto.cost_center_id),
             "report_expenses ##{gasto.id}: cost_center_id #{gasto.cost_center_id} no existe"
      assert User.exists?(gasto.user_invoice_id),
             "report_expenses ##{gasto.id}: user_invoice_id #{gasto.user_invoice_id} no existe"
      assert User.exists?(gasto.user_id),
             "report_expenses ##{gasto.id}: user_id #{gasto.user_id} no existe"
    end
  end

  test "los usuarios de fixture autentican con la contrasena de fixture" do
    etiquetas = %i[admin gerente ingeniero ingeniero_dos contador sin_permisos
                   dueno_centro ingeniero_sin_permisos]

    etiquetas.each do |etiqueta|
      assert users(etiqueta).valid_password?(AuthenticationHelpers::FIXTURE_PASSWORD),
             "users(:#{etiqueta}) no autentica con FIXTURE_PASSWORD. " \
             "Si alguien cambio devise stretches o el ERB de users.yml, es esto."
    end
  end

  test "el rol Administrador se llama exactamente Administrador" do
    # Case-sensitive a proposito: is_admin? compara el string literal y
    # db/seeds_staging.rb siembra "ADMINISTRADOR", que NUNCA es admin.
    assert_equal "Administrador", rols(:administrador).name
  end

  test "existen los ModuleControl que exige after_sign_in_path_for" do
    assert ModuleControl.exists?(name: "Reportes de servicios"),
           "Sin este ModuleControl, after_sign_in_path_for revienta con NoMethodError"
    assert ModuleControl.exists?(name: "Tablero de Ingenieros"),
           "Sin este ModuleControl, after_sign_in_path_for revienta con NoMethodError"
  end

  test "el rol administrador no tiene accion_modules asignados" do
    # Blinda la decision de diseno de rols.yml: si alguien se los agrega, los
    # tests de permisos dejan de distinguir is_admin? de has_menu_permission?
    # y un bug en is_admin? queda oculto.
    assert_empty rols(:administrador).accion_modules
  end

  test "parameterizations.yml asocia por user_id y no por asociacion" do
    assert_equal users(:admin).id, parameterizations(:antiguedad).user_id

    contenido = File.read(Rails.root.join("test/fixtures/parameterizations.yml"))
    claves = contenido.lines.grep(/^\s+user:\s/)
    assert_empty claves,
                 "parameterizations.yml usa la forma de asociacion `user:`. " \
                 "Parameterization NO declara belongs_to :user, asi que Rails " \
                 "intentaria escribir una columna `user` inexistente y tumbaria " \
                 "`fixtures :all` entero."

    # El criterio de aceptacion del paquete se verifica con un grep literal
    # sobre el archivo. Citar la forma prohibida dentro de un comentario daba
    # rojo sin haber ningun defecto real, asi que la cadena no puede aparecer
    # tampoco en los comentarios: se describe con palabras, no se transcribe.
    refute_includes contenido, "user: admin",
                    "parameterizations.yml contiene la cadena literal " \
                    "prohibida (aunque sea dentro de un comentario). " \
                    "Describe la forma de asociacion con palabras."
  end
end
