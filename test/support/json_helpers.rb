# Aserciones sobre los contratos JSON de 00-ARQUITECTURA.md seccion 3.
module JsonHelpers
  # NO memoiza a proposito: un test con dos requests que asierte sobre el cuerpo
  # del primero creyendo que es el segundo es un falso verde real. Parsear dos
  # veces en un test cuesta cero.
  #
  # Firma: json_body -> Hash con claves String
  def json_body
    JSON.parse(response.body)
  end

  # Contrato { success: "...", type: "success", register: {...} }
  #
  # Firma: assert_json_success(mensaje: nil) -> Hash (el "register") o nil
  def assert_json_success(mensaje: nil)
    body = json_body
    assert_response :success
    assert_equal "success", body["type"],
                 "Se esperaba type=success, body: #{response.body}"
    assert_equal mensaje, body["success"] if mensaje
    body["register"]
  end

  # Contrato { success: "!Ocurrio un error!", type: "error", message: [...] }
  # con HTTP 200 (el patron viejo de esta app).
  #
  # Firma: assert_json_error(incluye: nil) -> Array de mensajes
  def assert_json_error(incluye: nil)
    body = json_body
    assert_response :success
    assert_equal "error", body["type"],
                 "Se esperaba type=error, body: #{response.body}"
    assert_kind_of Array, body["message"]
    if incluye
      assert body["message"].any? { |m| m.to_s.include?(incluye) },
             "Se esperaba un mensaje que contenga #{incluye.inspect}, hubo: #{body["message"].inspect}"
    end
    body["message"]
  end

  # Contrato { type: "error", message: [...] } con HTTP 403.
  # Es el de los endpoints NUEVOS; los viejos redirigen 302 al login.
  #
  # Firma: assert_json_forbidden -> Array de mensajes
  def assert_json_forbidden
    body = json_body
    assert_response :forbidden
    assert_equal "error", body["type"],
                 "Se esperaba type=error, body: #{response.body}"
    body["message"]
  end

  # Contrato de listado { data: [...], total: N }
  #
  # Firma: assert_json_list(total: nil) -> Array
  def assert_json_list(total: nil)
    body = json_body
    assert_response :success
    assert_kind_of Array, body["data"],
                   "Se esperaba una clave data con un Array, body: #{response.body[0, 300]}"
    assert_equal total, body["total"] if total
    body["data"]
  end
end
