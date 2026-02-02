import React from 'react';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import { CmModal, CmButton } from "../../generalcomponents/ui";

class formCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  handleSubmit = (e) => {
    e.preventDefault();
  };

  render() {
    var p = this.props;
    var title = p.titulo || "Orden de compra";
    var icon = "fas fa-money-check-alt";

    return (
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        title={<span><i className={icon} /> {title}</span>}
        size="lg"
        footer={
          <React.Fragment>
            <CmButton variant="outline" onClick={p.toggle}>Cerrar</CmButton>
            <CmButton variant="accent" onClick={p.submit} disabled={p.isLoading}>
              {p.isLoading
                ? <React.Fragment><i className="fas fa-spinner fa-spin" /> Creando...</React.Fragment>
                : <React.Fragment><i className="fas fa-save" /> {p.nameSubmit}</React.Fragment>
              }
            </CmButton>
          </React.Fragment>
        }
      >
        <form onSubmit={this.handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-4">
              <label>Fecha de generacion <small className="validate-label">*</small></label>
              <input
                type="date"
                name="created_date"
                value={p.formValues.created_date}
                onChange={p.onChangeForm}
                className={"form form-control" + (p.errorValues === false && p.formValues.created_date === "" ? " error-class" : "")}
              />
            </div>

            <div className="col-md-6 mb-4">
              <label>Numero de orden <small className="validate-label">*</small></label>
              <input
                type="text"
                name="order_number"
                value={p.formValues.order_number}
                onChange={p.onChangeForm}
                className={"form form-control" + (p.errorValues === false && p.formValues.order_number === "" ? " error-class" : "")}
                placeholder="Numero de orden"
              />
            </div>

            <div className={"col-md-" + (p.cost_center_id === undefined ? "6" : "12") + " mt-2"}>
              <label>Valor<small className="validate-label">*</small></label>
              <NumberFormat
                name="order_value"
                thousandSeparator={true}
                prefix={"$"}
                className={"form form-control" + (p.errorValues === false && p.formValues.order_value === "" ? " error-class" : "")}
                value={p.formValues.order_value}
                onChange={p.onChangeForm}
                placeholder="Valor"
              />
            </div>

            {p.cost_center_id === undefined && (
              <div className="col-md-6 mt-2">
                <input
                  type="hidden"
                  name="cost_center_id"
                  value={p.formAutocompleteCentro.value}
                />
                <label>Centro de costo</label>
                <Select
                  onChange={p.onChangeAutocompleteCentro}
                  options={p.centro}
                  autoFocus={false}
                  className={"link-form" + (p.errorValues === false && p.formValues.cost_center_id === "" ? " error-class" : "")}
                  value={p.formAutocompleteCentro}
                />
              </div>
            )}

            <div className="col-md-12 mt-2">
              <label>Archivo<small className="validate-label">*</small></label>
              <input
                type="file"
                name="reception_report_file"
                onChange={p.onChangehandleFileOrderFile}
                className="form form-control"
                placeholder="Comprobante"
              />
            </div>

            <div className="col-md-12 mt-4">
              <textarea
                name="description"
                value={p.formValues.description}
                onChange={p.onChangeForm}
                rows="4"
                className="form form-control"
                placeholder="Descripcion..."
              />
            </div>

            {p.errorValues === false && (
              <div className="col-md-12 mt-2">
                <div className="alert alert-danger" role="alert">
                  <b>Debes de completar todos los campos requeridos</b>
                </div>
              </div>
            )}
          </div>
        </form>
      </CmModal>
    );
  }
}

export default formCreate;
