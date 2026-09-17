import React from 'react';
import Index from "../components/Documentation/index";
import WebpackerReact from 'webpacker-react';

// Pack de Configuracion > Documentacion. Mismo esqueleto que
// ExpenseRuleIndex.js: el pack solo monta y reenvia props; la logica vive en
// components/Documentation/.
class DocumentationIndex extends React.Component {
  render() {
    return (
      <Index
        estados={this.props.estados || {}}
        limits={this.props.limits || {}}
      />
    );
  }
}

export default DocumentationIndex;

WebpackerReact.setup({ DocumentationIndex });
