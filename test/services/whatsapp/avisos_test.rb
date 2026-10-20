# frozen_string_literal: true

require "test_helper"

# Avisos de aprobacion por WhatsApp (paquete 17, fase 3).
class Whatsapp::AvisosTest < ActiveSupport::TestCase
  include WhatsappTestHelpers

  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    @dueno = users(:dueno_centro)
    @ingeniero = users(:ingeniero)
    @gasto = as_user(users(:admin)) do
      ReportExpense.create!(user: users(:admin), cost_center: @centro, user_invoice: @ingeniero,
                            invoice_name: "Hotel del aviso", invoice_date: Date.new(2026, 6, 1),
                            invoice_number: "FE-WA-#{SecureRandom.hex(3)}", identification: "900111222",
                            invoice_value: 10_000.0, invoice_tax: 0.0, invoice_total: 10_000.0)
    end
    @whatsapp = FakeWhatsappClient.new
  end

  def escribio(usuario, hace:)
    WhatsappMessage.create!(wamid: "wamid.#{SecureRandom.hex(4)}", direction: WhatsappMessage::ENTRANTE,
                            user: usuario, wa_id: "573001234567", message_type: "text", body: "hola",
                            created_at: hace.ago)
  end

  def con_avisos(**extra, &bloque)
    con_whatsapp(WHATSAPP_AVISOS: "true", **extra, &bloque)
  end

  def avisar(tipo, destinatario, decisor = nil)
    Whatsapp::AvisoJob.new.perform(tipo, @gasto.id, destinatario.id, decisor&.id, client: @whatsapp)
  end

  test "con el interruptor apagado no se encola ningun aviso" do
    con_whatsapp do
      assert_no_enqueued_jobs(only: Whatsapp::AvisoJob) do
        Whatsapp::Avisos.avisar("decision", @gasto, @ingeniero)
      end
    end
  end

  test "con el interruptor encendido se encola el aviso" do
    con_avisos do
      assert_enqueued_with(job: Whatsapp::AvisoJob) { Whatsapp::Avisos.avisar("decision", @gasto, @ingeniero) }
    end
  end

  test "a quien nunca le escribio al numero no se le manda nada" do
    con_avisos { avisar("decision", @ingeniero) }
    assert_empty @whatsapp.enviados
  end

  test "dentro de la ventana de 24 h la decision va como texto" do
    escribio(@ingeniero, hace: 2.hours)
    as_user(@dueno) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
    con_avisos { avisar("decision", @ingeniero, @dueno) }

    texto = @whatsapp.textos.last
    assert_includes texto, "##{@gasto.id}"
    assert_includes texto, "aprobado"
    assert_equal "573001234567", @whatsapp.enviados.last[:destino][:wa_id]
  end

  test "un rechazo lleva el motivo" do
    escribio(@ingeniero, hace: 1.hour)
    as_user(@dueno) do
      @gasto.rechazar(actor: @dueno, motivo: "No corresponde al proyecto")
      @gasto.save!
    end
    con_avisos { avisar("decision", @ingeniero, @dueno) }
    assert_includes @whatsapp.textos.last, "rechazado"
    assert_includes @whatsapp.textos.last, "No corresponde al proyecto"
  end

  test "el aviso al dueno trae el enlace de aprobacion" do
    escribio(@dueno, hace: 1.hour)
    con_avisos { avisar("pendiente", @dueno) }
    assert_includes @whatsapp.textos.last, "/gastos/aprobar?t="
  end

  test "fuera de la ventana y sin plantilla configurada no se manda nada" do
    escribio(@ingeniero, hace: 3.days)
    con_avisos { avisar("decision", @ingeniero, @dueno) }
    assert_empty @whatsapp.enviados
  end

  test "fuera de la ventana con plantilla configurada se manda la plantilla con sus parametros" do
    escribio(@ingeniero, hace: 3.days)
    con_avisos(WHATSAPP_PLANTILLA_DECISION: "aviso_decision_gasto") { avisar("decision", @ingeniero, @dueno) }

    envio = @whatsapp.enviados.last
    assert_equal :plantilla, envio[:tipo]
    assert_equal "aviso_decision_gasto", envio[:nombre]
    assert_equal 5, envio[:parametros].size
    assert_equal @gasto.id.to_s, envio[:parametros][1]
    assert_equal "template", WhatsappMessage.salientes.last.message_type
  end

  test "aprobar un gasto con el aviso de correo encendido tambien encola el de WhatsApp" do
    con_aviso_de_aprobacion do
      con_avisos do
        assert_enqueued_with(job: Whatsapp::AvisoJob) do
          as_user(@dueno) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
        end
      end
    end
  end
end
