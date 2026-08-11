# frozen_string_literal: true

require "test_helper"

class UsersFindByPhoneToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  def buscar(phone, api_key: McpTestHelpers::VALID_KEY)
    UsersFindByPhoneTool.call(phone: phone, server_context: ctx(api_key: api_key))
  end

  test "encuentra a la persona por su telefono" do
    with_mcp_key do
      cuerpo = tool_json(buscar("+57 300 123 4567"))
      assert_equal true, cuerpo["found"]
      assert_equal users(:ingeniero).id, cuerpo["user"]["id"]
      assert_equal "Ingeniero", cuerpo["user"]["rol_name"]
    end
  end

  test "acepta el formato del gateway de whatsapp" do
    with_mcp_key do
      assert_equal users(:ingeniero).id, tool_json(buscar("whatsapp:+573001234567"))["user"]["id"]
    end
  end

  test "sin match devuelve found false con motivo no_match" do
    with_mcp_key do
      cuerpo = tool_json(buscar("+57 322 000 0000"))
      assert_equal false, cuerpo["found"]
      assert_equal "no_match", cuerpo["reason"]
      assert_includes cuerpo["message"], "administrador"
    end
  end

  test "un telefono repetido devuelve found false con motivo ambiguous" do
    with_mcp_key do
      cuerpo = tool_json(buscar("3009999999"))
      assert_equal false, cuerpo["found"]
      assert_equal "ambiguous", cuerpo["reason"]
    end
  end

  test "un telefono demasiado corto devuelve invalid_phone" do
    with_mcp_key do
      cuerpo = tool_json(buscar("30012"))
      assert_equal false, cuerpo["found"]
      assert_equal "invalid_phone", cuerpo["reason"]
    end
  end

  test "la respuesta no contiene ningun campo sensible" do
    with_mcp_key do
      texto = tool_text(buscar("+57 300 123 4567"))
      %w[encrypted_password reset_password_token current_sign_in_ip last_sign_in_ip].each do |campo|
        refute_includes texto, campo
      end
    end
  end

  test "KEYS no incluye columnas sensibles" do
    prohibidas = %i[encrypted_password reset_password_token current_sign_in_ip last_sign_in_ip]
    assert_empty (UsersFindByPhoneTool::KEYS & prohibidas)
  end

  test "sin api key devuelve unauthorized" do
    with_mcp_key { assert_tool_error buscar("+57 300 123 4567", api_key: "mala"), "Unauthorized" }
  end
end
