import React from 'react';
import Index from "../components/ExpenseRule/index";
import WebpackerReact from 'webpacker-react';

// Pack de la pantalla de Reglas de gastos (paquete 14, tarea 6).
//
// Mismo esqueleto que Parameterizations.js: el pack solo monta y reenvia props.
// Toda la logica vive en components/ExpenseRule/, para que el archivo que
// webpacker-react registra sea trivial y no haya que recompilar medio bundle
// por cambiar un texto del formulario.
class ExpenseRuleIndex extends React.Component {
  render() {
    return (
      <React.Fragment>
        <Index
          current_user={this.props.current_user}
          estados={this.props.estados}
          roles={this.props.roles}
        />
      </React.Fragment>
    );
  }
}

export default ExpenseRuleIndex;

WebpackerReact.setup({ ExpenseRuleIndex });
