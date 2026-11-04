# Arma los .xls (gema spreadsheet) que exportan las tablas de Centros de costo,
# Materiales, Ordenes de compra y Tableristas, con el formato de siempre:
# encabezado blanco en negrita sobre fondo de color y filas de alto 25.
#
# Regla de esas exportaciones (3-nov-2026): el Excel sale de la MISMA consulta
# que la tabla (filtros, busqueda y orden) y trae las columnas de la pantalla
# en el mismo orden. Cada controlador define ENCABEZADOS_EXCEL y sus filas.
module ExcelXls
  extend ActiveSupport::Concern

  ANCHO_COLUMNA = 30

  private

  # encabezados: Array de String. filas: Array de Arrays, en el orden de los
  # encabezados. anchos: { "Encabezado" => ancho } para las que no van en 30.
  def xls_libro(encabezados, filas, anchos: {})
    book = Spreadsheet::Workbook.new
    sheet = book.create_worksheet

    head_format = Spreadsheet::Format.new color: :white,
                                          weight: :bold,
                                          size: 12,
                                          pattern_bg_color: :xls_color_10,
                                          pattern: 2,
                                          vertical_align: :middle,
                                          align: :left

    rows_format = Spreadsheet::Format.new color: :black,
                                          weight: :normal,
                                          size: 13,
                                          align: :left

    sheet.row(0).concat(encabezados)
    sheet.row(0).height = 20
    encabezados.each_index { |col| sheet.row(0).set_format(col, head_format) }

    filas.each.with_index(1) do |fila, i|
      sheet.row(i).concat(fila)
      sheet.row(i).height = 25
      sheet.row(i).default_format = rows_format
    end

    encabezados.each_with_index { |enc, col| sheet.column(col).width = anchos.fetch(enc, ANCHO_COLUMNA) }

    io = StringIO.new
    book.write(io)
    io.string
  end

  # Dia en Colombia de un created_at / updated_at (la app guarda en UTC).
  def xls_fecha_local(momento)
    momento&.in_time_zone("America/Bogota")&.to_date
  end
end
