# == Schema Information
#
# Table name: report_expense_options
#
#  id         :bigint           not null, primary key
#  category   :string
#  name       :string
#  used_by_ai :boolean          default(TRUE), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer
#

class ReportExpenseOption < ApplicationRecord
  # TIPOS DE GASTO QUE NO EXIGEN COMPROBANTE (decision de producto, 2026-09-16).
  #
  # Los viaticos se liquidan sin factura: el comprobante obligatorio
  # (ReportExpense#comprobante_obligatorio) dejaba a la gente sin forma de
  # registrarlos. Hoy es un solo tipo, "Viáticos de transporte 510521" (id 27
  # en produccion y en desarrollo).
  #
  # POR NOMBRE Y NO POR ID: el id cambia entre produccion, desarrollo y los
  # fixtures, y un tipo nuevo de viaticos quedaria exigiendo comprobante sin
  # que nadie lo note. Se compara el nombre normalizado (sin tildes, sin
  # mayusculas y con el espacio no separable U+00A0 que traen varios nombres
  # de produccion convertido en espacio normal).
  PREFIJOS_VIATICOS = %w[viaticos].freeze

  # Hoy los viaticos son el UNICO tipo exento de comprobante, pero son dos
  # preguntas distintas: "¿es viatico?" (decide que nombre propone el
  # formulario en el campo Nombre) y "¿exige comprobante?". La segunda apunta a
  # la primera para que, el dia que aparezca un tipo exento que no sea viatico,
  # agregarlo aqui no le cambie el nombre a ningun gasto.
  PREFIJOS_SIN_COMPROBANTE = PREFIJOS_VIATICOS

  def self.normalizar_nombre(nombre)
    I18n.transliterate(nombre.to_s.tr(" ", " ")).downcase.squish
  end

  # Ids que el formulario web necesita para quitar el asterisco y no frenar el
  # guardado. Son decenas de opciones, asi que filtrar en Ruby no cuesta nada.
  def self.ids_sin_comprobante
    where(category: "Tipo").select(&:comprobante_opcional?).map(&:id)
  end

  # Ids de los tipos de viatico. El formulario los usa para proponer en el campo
  # Nombre a la persona responsable en vez de un proveedor: un viatico se le
  # paga a alguien, no lo factura un tercero, y la gente no sabia que escribir.
  def self.ids_viaticos
    where(category: "Tipo").select(&:viatico?).map(&:id)
  end

  def viatico?
    return false unless category == "Tipo"

    nombre = self.class.normalizar_nombre(name)
    PREFIJOS_VIATICOS.any? { |prefijo| nombre.start_with?(prefijo) }
  end

  def comprobante_opcional?
    return false unless category == "Tipo"

    nombre = self.class.normalizar_nombre(name)
    PREFIJOS_SIN_COMPROBANTE.any? { |prefijo| nombre.start_with?(prefijo) }
  end
end
