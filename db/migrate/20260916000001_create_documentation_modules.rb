# Modulo de Documentacion (Configuracion > Documentacion).
#
# Dos tablas: el "modulo" (la tarjeta de la pantalla, p. ej. "Manuales de
# gastos") y sus archivos. Un archivo pertenece a UN solo modulo; no hay
# carpetas anidadas porque nadie las pidio y la pantalla es una grilla plana.
#
# EL NOMBRE ES UNICO SIN DISTINGUIR MAYUSCULAS, y se garantiza en la base con
# un indice sobre LOWER(name): la validacion del modelo sola no alcanza cuando
# dos administradores guardan a la vez, y dos tarjetas "Manuales" y "manuales"
# solo confunden.
#
# `user_id` SIN llave foranea a proposito, en las dos tablas: es el autor, un
# dato informativo. Con FK, borrar un usuario que alguna vez subio un manual
# fallaria, y los usuarios de esta app si se borran.
#
# `documentation_module_id` SI lleva FK: un archivo sin modulo no se ve en
# ninguna parte y ocuparia espacio en S3 para siempre.
class CreateDocumentationModules < ActiveRecord::Migration[6.1]
  def change
    create_table :documentation_modules do |t|
      t.string :name, null: false
      t.text :description
      t.integer :user_id
      t.timestamps
    end
    add_index :documentation_modules, "LOWER(name)", unique: true,
              name: "index_documentation_modules_on_lower_name"

    create_table :documentation_files do |t|
      t.references :documentation_module, null: false, foreign_key: true
      # Identificador de CarrierWave (el nombre SANEADO con el que se guardo).
      t.string :file, null: false
      # Nombre ORIGINAL, con tildes y espacios: es el que se muestra y el que
      # lleva la descarga. CarrierWave sanea el guardado y cambiaria "Guía de
      # gastos.pdf" por "Gu_a_de_gastos.pdf".
      t.string :name, null: false
      t.string :content_type
      # bigint: el tope es 50 MB y cabe en integer, pero no cuesta nada dejar
      # que el tope suba sin otra migracion.
      t.bigint :byte_size
      t.integer :user_id
      t.timestamps
    end
  end
end
