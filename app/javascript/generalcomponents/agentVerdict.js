// El veredicto del agente sobre las instrucciones de las reglas de gasto, del
// lado del formulario. Lo usan los DOS formularios de gasto —el de Gastos
// (packs/ReportExpenseIndex.js) y el del centro de costos
// (ShowConstCenter/ExpensesTable.jsx + ReportExpense/FormCreate.jsx)—: copiado
// en cada uno, el dia que se arregle uno el otro seguiria pintando otra cosa.

// LOS HALLAZGOS DEL AGENTE QUE APLICAN AL TIPO DE GASTO ELEGIDO AHORA (2026-10-14).
//
// El agente lee el comprobante antes de que se elija el tipo, contra las reglas
// de TODOS los tipos de la persona, y cada hallazgo vuelve con su regla
// (`policy.findings_detail` + `policy.rules`). Si despues se elige un tipo al
// que esa regla no aplica —el licor en un gasto de representacion—, el aviso
// sobra. Esto es CORTESIA: al guardar, el servidor hace el mismo filtro y es el
// que decide (ExpenseRuleService.check_agent_policy).
//
// Sin tipo elegido no se descarta nada: todavia no se sabe a que aplica.
// => { mostrar, hallazgos: [{ rule_id, message }], frena }
export function hallazgosVigentes(pol, tipoId) {
  var detalle = (pol.findings_detail && pol.findings_detail.length)
    ? pol.findings_detail
    : (pol.findings || []).map(function(m) { return { rule_id: null, message: m }; });
  // Respuesta de un servidor sin reglas por hallazgo: se pinta como antes.
  if (!pol.rules) return { mostrar: true, hallazgos: detalle, frena: !!pol.blocking };

  var tipo = tipoId ? parseInt(tipoId, 10) : null;
  var porId = {};
  pol.rules.forEach(function(r) { porId[r.id] = r; });
  var aplica = function(r) {
    if (tipo === null) return true;
    if ((r.excluded_type_ids || []).indexOf(tipo) !== -1) return false;
    var incluidos = r.included_type_ids || [];
    return incluidos.length === 0 || incluidos.indexOf(tipo) !== -1;
  };
  var algunaObligatoria = pol.rules.some(function(r) { return r.mandatory && aplica(r); });

  // "No cumple" sin motivos: no hay regla a la cual atribuirlo.
  if (detalle.length === 0) return { mostrar: algunaObligatoria || pol.rules.some(aplica), hallazgos: [], frena: algunaObligatoria };

  var vigentes = detalle.filter(function(h) {
    var r = porId[h.rule_id];
    return !r || aplica(r);
  });
  var frena = vigentes.some(function(h) {
    var r = porId[h.rule_id];
    return r ? r.mandatory : algunaObligatoria;
  });
  return { mostrar: vigentes.length > 0, hallazgos: vigentes, frena: frena };
}

// Lo que viaja al guardar, en el campo `policy_verdict`
// (ReportExpensesController#agent_policy_verdict_param). TODOS los hallazgos con
// su regla, no solo los que se pintan: el filtro por tipo lo repite el servidor,
// que es el que decide. `judged_rule_ids` le dice que reglas vio el agente, para
// que vuelva a juzgar si al guardar aplica alguna que no vio (por ejemplo,
// porque se cambio el responsable). null si nadie juzgo: ausente significa
// "nadie lo juzgo" y no frena nada.
export function veredictoParaGuardar(pol) {
  if (!pol || (pol.compliant !== true && pol.compliant !== false)) return null;
  var detalle = (pol.findings_detail && pol.findings_detail.length)
    ? pol.findings_detail
    : (pol.findings || []).map(function(m) { return { rule_id: null, message: m }; });
  return JSON.stringify({ compliant: pol.compliant, findings: detalle, judged_rule_ids: pol.judged_rule_ids || [] });
}
