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
  PREFIJOS_SIN_COMPROBANTE = %w[viaticos].freeze

  def self.normalizar_nombre(nombre)
    I18n.transliterate(nombre.to_s.tr(" ", " ")).downcase.squish
  end

  # Ids que el formulario web necesita para quitar el asterisco y no frenar el
  # guardado. Son decenas de opciones, asi que filtrar en Ruby no cuesta nada.
  def self.ids_sin_comprobante
    where(category: "Tipo").select(&:comprobante_opcional?).map(&:id)
  end

  def comprobante_opcional?
    return false unless category == "Tipo"

    nombre = self.class.normalizar_nombre(name)
    PREFIJOS_SIN_COMPROBANTE.any? { |prefijo| nombre.start_with?(prefijo) }
  end
end
