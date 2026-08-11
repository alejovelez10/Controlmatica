# frozen_string_literal: true

require "test_helper"
# Se estubea Mcp::S3DirectUpload entero: la suite no abre sockets.
require "minitest/mock"

class ReportExpensesReceiptToolsTest < ActiveSupport::TestCase
  include McpTestHelpers

  PDF = Rails.root.join("test/fixtures/files/comprobante.pdf")
  EXE = Rails.root.join("test/fixtures/files/malicioso.exe")

  setup do
    @gasto = report_expenses(:one)
    @key = "#{Mcp::S3DirectUpload::PREFIX}/#{SecureRandom.uuid}/comprobante.pdf"
    @telefono = "+57 300 123 4567"
  end

  # OJO: minitest restaura el método haciendo `undef_method` en la metaclase, así
  # que estubear DOS VECES el mismo método (uno anidado dentro del otro) lo deja
  # indefinido para el resto de la suite. Por eso `delete` es parámetro y no se
  # vuelve a estubear dentro del bloque.
  def con_s3(head: { content_length: File.size(PDF), content_type: "application/pdf" },
             cuerpo: File.binread(PDF), delete: true, &bloque)
    Mcp::S3DirectUpload.stub(:configured?, true) do
      Mcp::S3DirectUpload.stub(:presign_put, "https://bucket.s3.amazonaws.com/firmada") do
        Mcp::S3DirectUpload.stub(:head, head) do
          Mcp::S3DirectUpload.stub(:fetch_body, cuerpo) do
            Mcp::S3DirectUpload.stub(:delete, delete, &bloque)
          end
        end
      end
    end
  end

  def url_get(**args)
    ReportExpensesReceiptUrlGetTool.call(server_context: ctx, report_expense_id: @gasto.id,
                                         filename: "factura.pdf", content_type: "application/pdf",
                                         **args)
  end

  def adjuntar(ctx_args: { actor_phone: @telefono }, **args)
    ReportExpensesAttachReceiptTool.call(server_context: ctx(**ctx_args),
                                         report_expense_id: @gasto.id, **args)
  end

  # --- build_key / own_key? -------------------------------------------------

  test "build_key sanea el nombre del archivo" do
    key = Mcp::S3DirectUpload.build_key("../../etc/pas swd.pdf")
    assert Mcp::S3DirectUpload.own_key?(key)
    refute_includes key.sub(Mcp::S3DirectUpload::PREFIX, ""), ".."
    assert_equal 3 + 2, key.split("/").size # uploads/tmp/mcp_receipts + uuid + archivo
  end

  test "build_key sobrevive a un nombre que es solo puntos" do
    assert Mcp::S3DirectUpload.own_key?(Mcp::S3DirectUpload.build_key(".."))
  end

  test "own_key? rechaza una clave de otro directorio" do
    refute Mcp::S3DirectUpload.own_key?("uploads/user/avatar/1/foto.jpg")
  end

  test "own_key? rechaza una clave sin uuid" do
    refute Mcp::S3DirectUpload.own_key?("#{Mcp::S3DirectUpload::PREFIX}/x/a.pdf")
  end

  # --- report_expenses_receipt_url_get -------------------------------------

  test "url_get devuelve upload_url y upload_key" do
    con_s3 do
      with_mcp_key do
        cuerpo = tool_json(url_get)
        assert_equal "https://bucket.s3.amazonaws.com/firmada", cuerpo["upload_url"]
        assert Mcp::S3DirectUpload.own_key?(cuerpo["upload_key"])
        assert_equal "PUT", cuerpo["method"]
        assert_equal "application/pdf", cuerpo["headers"]["Content-Type"]
        assert_equal 900, cuerpo["expires_in_seconds"]
      end
    end
  end

  test "url_get rechaza una extension no permitida" do
    con_s3 do
      with_mcp_key do
        texto = tool_text(url_get(filename: "virus.exe"))
        assert_includes texto, "pdf"
        refute_includes texto, "upload_url"
      end
    end
  end

  test "url_get rechaza un content type no permitido" do
    con_s3 do
      with_mcp_key do
        assert_tool_error url_get(content_type: "application/x-msdownload"), "no permitido"
      end
    end
  end

  test "url_get rechaza un tamano mayor a 10 MB" do
    con_s3 do
      with_mcp_key { assert_tool_error url_get(byte_size: 11_000_000), "10 MB" }
    end
  end

  test "url_get sin S3 configurado sugiere file_base64" do
    Mcp::S3DirectUpload.stub(:configured?, false) do
      with_mcp_key { assert_tool_error url_get, "file_base64" }
    end
  end

  test "url_get con gasto inexistente devuelve not found" do
    con_s3 do
      with_mcp_key do
        res = ReportExpensesReceiptUrlGetTool.call(server_context: ctx, report_expense_id: 999_999,
                                                   filename: "f.pdf", content_type: "application/pdf")
        assert_tool_error res, "Not found: report_expense"
      end
    end
  end

  test "url_get sin api key devuelve unauthorized" do
    con_s3 do
      with_mcp_key do
        res = ReportExpensesReceiptUrlGetTool.call(server_context: ctx(api_key: "mala"),
                                                   report_expense_id: @gasto.id,
                                                   filename: "f.pdf", content_type: "application/pdf")
        assert_tool_error res, "Unauthorized"
      end
    end
  end

  # --- report_expenses_attach_receipt: modo upload_key ---------------------

  test "attach con upload_key ajena es rechazado" do
    con_s3 do
      with_mcp_key do
        assert_tool_error adjuntar(upload_key: "uploads/user/avatar/1/foto.jpg"), "upload_key inválida"
        assert_nil @gasto.reload.receipt_file.file
      end
    end
  end

  test "attach con upload_key inexistente en S3 pide reintentar" do
    con_s3(head: nil) do
      with_mcp_key do
        assert_tool_error adjuntar(upload_key: @key), "Vuelve a pedir la URL"
        assert_nil @gasto.reload.receipt_file.file
      end
    end
  end

  test "attach con un archivo mayor al maximo es rechazado" do
    con_s3(head: { content_length: 11_000_000, content_type: "application/pdf" }) do
      with_mcp_key do
        assert_tool_error adjuntar(upload_key: @key), "10 MB"
        assert_nil @gasto.reload.receipt_file.file
      end
    end
  end

  test "attach por upload_key asocia el archivo" do
    con_s3 do
      with_mcp_key do
        cuerpo = tool_json(adjuntar(upload_key: @key))
        refute_nil @gasto.reload.receipt_file.file
        refute_nil cuerpo["receipt_file_url"]
      end
    end
  end

  test "attach borra el temporal despues de asociar" do
    borrados = []
    Mcp::S3DirectUpload.stub(:configured?, true) do
      Mcp::S3DirectUpload.stub(:head, { content_length: File.size(PDF), content_type: "application/pdf" }) do
        Mcp::S3DirectUpload.stub(:fetch_body, File.binread(PDF)) do
          Mcp::S3DirectUpload.stub(:delete, ->(k) { borrados << k; true }) do
            with_mcp_key { adjuntar(upload_key: @key) }
          end
        end
      end
    end
    assert_equal [@key], borrados
  end

  test "attach sigue respondiendo exito si el borrado del temporal falla" do
    # `delete` devuelve false cuando S3 falla (nunca levanta: el rescue vive
    # dentro del módulo). Un objeto huérfano en S3 es preferible a decirle al
    # agente que falló algo que sí funcionó.
    con_s3(delete: false) do
      with_mcp_key do
        cuerpo = tool_json(adjuntar(upload_key: @key))
        refute_nil cuerpo["receipt_file_url"]
        refute_nil @gasto.reload.receipt_file.file
      end
    end
  end

  test "S3DirectUpload.delete no propaga excepciones de red" do
    Mcp::S3DirectUpload.stub(:connection, ->(*) { raise Excon::Error, "socket cerrado" }) do
      assert_equal false, Mcp::S3DirectUpload.delete(@key)
    end
  end

  test "S3DirectUpload.head y fetch_body devuelven nil ante un fallo de red" do
    Mcp::S3DirectUpload.stub(:connection, ->(*) { raise Excon::Error, "socket cerrado" }) do
      assert_nil Mcp::S3DirectUpload.head(@key)
      assert_nil Mcp::S3DirectUpload.fetch_body(@key)
    end
  end

  test "attach sin actor identificado no adjunta" do
    con_s3 do
      with_mcp_key do
        assert_tool_error adjuntar(ctx_args: {}, upload_key: @key), "no se pudo identificar"
        assert_nil @gasto.reload.receipt_file.file
      end
    end
  end

  test "attach registra last_user_edited_id del actor" do
    con_s3 do
      with_mcp_key { adjuntar(upload_key: @key) }
    end
    assert_equal users(:ingeniero).id, @gasto.reload.last_user_edited_id
  end

  test "attach con upload_key y file_base64 a la vez usa upload_key" do
    llamadas = 0
    Mcp::S3DirectUpload.stub(:configured?, true) do
      Mcp::S3DirectUpload.stub(:head, lambda { |_k|
        llamadas += 1
        { content_length: File.size(PDF), content_type: "application/pdf" }
      }) do
        Mcp::S3DirectUpload.stub(:fetch_body, File.binread(PDF)) do
          Mcp::S3DirectUpload.stub(:delete, true) do
            with_mcp_key do
              adjuntar(upload_key: @key, file_base64: Base64.strict_encode64("no me uses"),
                       filename: "otro.pdf", content_type: "application/pdf")
            end
          end
        end
      end
    end
    assert_equal 1, llamadas
    assert_equal File.size(PDF), @gasto.reload.receipt_file.size
  end

  test "attach reemplaza el comprobante existente" do
    con_s3 do
      with_mcp_key { adjuntar(upload_key: @key) }
    end
    with_mcp_key do
      adjuntar(file_base64: Base64.strict_encode64(File.binread(PDF)),
               filename: "segundo.pdf", content_type: "application/pdf")
    end
    assert_equal "segundo.pdf", @gasto.reload.receipt_file.file.filename
  end

  # --- report_expenses_attach_receipt: modo base64 -------------------------

  test "attach por base64 asocia el archivo" do
    with_mcp_key do
      adjuntar(file_base64: Base64.strict_encode64(File.binread(PDF)),
               filename: "comprobante.pdf", content_type: "application/pdf")
    end
    refute_nil @gasto.reload.receipt_file.file
  end

  test "attach por base64 rechaza base64 invalido" do
    with_mcp_key do
      assert_tool_error adjuntar(file_base64: "no-es-base64!!", filename: "x.pdf",
                                 content_type: "application/pdf"),
                        "base64"
    end
  end

  test "attach por base64 exige filename y content_type" do
    with_mcp_key do
      assert_tool_error adjuntar(file_base64: Base64.strict_encode64("hola")), "filename"
    end
  end

  test "attach por base64 rechaza mayor a 4 MB" do
    with_mcp_key do
      assert_tool_error adjuntar(file_base64: "A" * (5 * 1024 * 1024), filename: "x.pdf",
                                 content_type: "application/pdf"),
                        "4 MB"
    end
  end

  test "attach por base64 rechaza extension prohibida" do
    with_mcp_key do
      texto = tool_text(adjuntar(file_base64: Base64.strict_encode64(File.binread(EXE)),
                                 filename: "malicioso.exe", content_type: "application/octet-stream"))
      assert texto.start_with?("Error:")
      assert_nil @gasto.reload.receipt_file.file
    end
  end

  test "attach sin upload_key ni file_base64 explica que falta" do
    with_mcp_key { assert_tool_error adjuntar, "upload_key" }
  end

  test "attach con gasto inexistente devuelve not found" do
    with_mcp_key do
      res = ReportExpensesAttachReceiptTool.call(server_context: ctx(actor_phone: @telefono),
                                                 report_expense_id: 999_999, upload_key: @key)
      assert_tool_error res, "Not found: report_expense"
    end
  end

  test "attach sin api key devuelve unauthorized" do
    with_mcp_key { assert_tool_error adjuntar(ctx_args: { api_key: "mala" }, upload_key: @key), "Unauthorized" }
  end
end
