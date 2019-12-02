import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../Materials/FormCreate";
import ShowInfo from "../Materials/ShowInfo";
import NumberFormat from "react-number-format";

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: false,
      backdrop: "static",
      modeEdit: false,
      modalShow: false,
      action: {},
      title: "Nuevo convenio",
      id: "",

      ErrorValues: true,

      form: {
        provider_id: "",
        sales_date: "",
        sales_number: "",
        amount: "",
        delivery_date: "",
        sales_state: "",
        description: "",
        provider_invoice_number: "",
        provider_invoice_value: "",
        user_id: this.props.usuario.id,
        cost_center_id: ""
      },

      selectedOptionCentro: {
        cost_center_id: "",
        label: "Centro de costo"
      },

      dataCostCenter: []

    };

    this.toggle = this.toggle.bind(this);
  }

  MessageSucces = (name_success, type, error_message) => {
    Swal.fire({
      position: "center",
      type: type,
      html:
        "<p>" + error_message != undefined
          ? error_message
          : "asdasdasd" + "</p>",
      title: name_success,
      showConfirmButton: false,
      timer: 1500
    });
  };

  componentDidMount(){
    let array = []

    this.props.cost_center.map((item) => (
      array.push({label: item.code, value: item.id})
    ))

    this.setState({
      dataCostCenter: array
    })
  }

  handleChangeAutocompleteCentro = selectedOptionCentro => {
    this.setState({
      selectedOptionCentro,
      form: {
        ...this.state.form,
        cost_center_id: selectedOptionCentro.value
      }
    });
  };

  handleSubmit = e => {
    e.preventDefault();
  };

  handleChange = e => {
    this.setState({
      form: {
        ...this.state.form,
        [e.target.name]: e.target.value
      }
    });
  };

  validationForm = () => {
    if (
      this.state.form.created_date != "" &&
      this.state.form.order_number != "" &&
      this.state.form.order_value != ""
    ) {
      console.log("los campos estan llenos");
      this.setState({ ErrorValues: true });
      return true;
    } else {
      console.log("los campos no se han llenado");
      this.setState({ ErrorValues: false });
      return false;
    }
  };

  HandleClick = e => {
    if (this.validationForm() == true) {
      if (this.state.modeEdit == true) {
        fetch("/materials/" + this.state.action.id, {
          method: "PATCH", // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo();
            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              form: {
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
                provider_invoice_number: "",
                provider_invoice_value: "",
                user_id: this.props.usuario.id,
                ccost_center_id: ""
              }
            });
          });
      } else {
        fetch("/materials", {
          method: "POST", // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo();

            this.MessageSucces(data.message, data.type, data.message_error);

            this.setState({
              modal: false,
              form: {
                provider_id: "",
                sales_date: "",
                sales_number: "",
                amount: "",
                delivery_date: "",
                sales_state: "",
                description: "",
                provider_invoice_number: "",
                provider_invoice_value: "",
                user_id: this.props.usuario.id,
                cost_center_id: ""
              }
            });
          });
      }
    }
  };

  edit = modulo => {
    if (this.state.modeEdit === true) {
      this.setState({ modeEdit: false });
    } else {
      this.setState({ modeEdit: true });
    }

    this.toggle("edit");

    this.setState({
      action: modulo,
      title: "Editar Materiales",
      form: {
        provider_id: modulo.provider_id,
        sales_date: modulo.sales_date,
        sales_number: modulo.sales_number,
        amount: modulo.amount,
        delivery_date: modulo.delivery_date,
        sales_state: modulo.sales_state,
        description: modulo.description,
        provider_invoice_number: modulo.provider_invoice_number,
        provider_invoice_value: modulo.provider_invoice_value,
        user_id: this.props.usuario.id,
        cost_center_id: modulo.cost_center_id
      },

      selectedOptionCentro: {
        cost_center_id: modulo.cost_center_id,
        label: `${modulo.cost_center != undefined ? modulo.cost_center.code : ""}`
      },

    });
  };

  toggle(from) {
    if (from == "edit") {
      this.setState({ modeEdit: true });
    } else if (from == "new") {
      this.setState({
        modeEdit: false,
        title: "Agregar materiales",
        form: {
          provider_id: "",
          sales_date: "",
          sales_number: "",
          amount: "",
          delivery_date: "",
          sales_state: "",
          description: "",
          provider_invoice_number: "",
          provider_invoice_value: "",
          user_id: this.props.usuario.id,
          cost_center_id: ""
        }
      });
    } else {
      if (this.state.modeEdit === true) {
        this.setState({ modeEdit: false });
      } else {
        this.setState({ modeEdit: true });
      }

      this.setState({
        ErrorValues: true
      });
    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }

  delete = id => {
    Swal.fire({
      title: "Estas seguro?",
      text: "El registro sera eliminado para siempre!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {
        fetch("/materials/" + id, {
          method: "delete"
        })
          .then(response => response.json())
          .then(response => {
            this.props.loadInfo();

            Swal.fire(
              "Borrado!",
              "¡El registro fue eliminado con exito!",
              "success"
            );
          });
      }
    });
  };

  show = (estado, info) => {
    if (estado == "open") {
      this.setState({ modalShow: true, action: info });
    } else if (estado == "close") {
      this.setState({ modalShow: false, action: {} });
    }
  };

  render() {
    return (
      <React.Fragment>
        <div className="col-md-12 p-0 mb-4">
          <div className="row">
            <div className="col-md-8 text-left">
              <h2>
                <span className="badge badge-secondary">
                  Materiales <i className="fas fa-users ml-2"></i>
                </span>
              </h2>
            </div>

            <div className="col-md-4 text-right mt-1 mb-1">
              
              <button
                className="btn btn-light mr-3"
                onClick={this.props.show}
                disabled={this.props.dataActions.length >= 1 ? false : true}
              >
                Filtros <i className="fas fa-search ml-2"></i>
              </button>

              {this.props.estados.create == true && (
                <button
                  type="button"
                  onClick={() => this.toggle("new")}
                  className="btn btn-secondary"
                >
                  Agregar materiales
                </button>
              )}
            </div>
          </div>
        </div>

        <FormCreate
          toggle={this.toggle}
          backdrop={this.state.backdrop}
          modal={this.state.modal}
          onChangeForm={this.handleChange}
          formValues={this.state.form}
          submit={this.HandleClick}
          FormSubmit={this.handleSubmit}
          titulo={this.state.title}
          nameSubmit={this.state.modeEdit == true ? "Actualizar" : "Crear"}
          errorValues={this.state.ErrorValues}
          modeEdit={this.state.modeEdit}
          providers={this.props.providers}

          /* AUTOCOMPLETE CENTRO DE COSTO */

          centro={this.state.dataCostCenter}
          onChangeAutocompleteCentro={this.handleChangeAutocompleteCentro}
          formAutocompleteCentro={this.state.selectedOptionCentro}
          
        />

        <ShowInfo
          toggle={this.show}
          backdrop={this.state.backdrop}
          modal={this.state.modalShow}
          infoShow={this.state.action}
          titulo={"Informacion detallada"}
        />

        <div className="content">
          <table className="table table-hover table-bordered" id="sampleTable">
            <thead>
              <tr className="tr-title">
                <th style={{width:"15%"}}>Centro de costo</th>
                <th style={{width:"15%"}}>Proveedor</th>
                <th style={{width:"16%"}}>Numero de orden</th>
                <th style={{width:"10%"}}>Valor</th>
                <th style={{width:"19%"}}>Descripción</th>
                <th style={{width:"15%"}}>Fecha de Orden</th>
                <th style={{width:"15%"}}>Fecha Entrega</th>
                <th style={{ width: "5%" }} className="text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {this.props.dataActions.length >= 1 ? (
                this.props.dataActions.map(accion => (
                  <tr key={accion.id}>
                    <td>{accion.cost_center.code}</td>
                    <td>{accion.provider.name}</td>
                    <td>{accion.sales_number}</td>
                    <td><NumberFormat value={accion.amount} displayType={"text"} thousandSeparator={true} prefix={"$"} /></td>
                    <td>{accion.description}</td>
                    <td>{accion.sales_date}</td>
                    <td>{accion.delivery_date}</td>
                  

                    <td className="text-center" style={{ width: "10px" }}>
                      <div
                        className="btn-group"
                        role="group"
                        aria-label="Button group with nested dropdown"
                      >
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-secondary"
                            id="btnGroupDrop1"
                            type="button"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                          >
                            <i className="fas fa-bars"></i>
                          </button>
                          <div className="dropdown-menu dropdown-menu-right">
                            {this.props.estados.edit == true && (
                              <button
                                onClick={() => this.show("open", accion)}
                                className="dropdown-item"
                              >
                                Ver informaciom
                              </button>
                            )}

                            {this.props.estados.edit == true && (
                              <button
                                onClick={() => this.edit(accion)}
                                className="dropdown-item"
                              >
                                Editar
                              </button>
                            )}

                            {this.props.estados.delete == true && (
                              <button
                                onClick={() => this.delete(accion.id)}
                                className="dropdown-item"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-1 mb-1">
                    <h4>No hay materiales</h4>
                    {this.props.estados.create == true && (
                      <button
                        type="button"
                        onClick={() => this.toggle("new")}
                        className="btn btn-secondary mt-3 mb-3"
                      >
                        Agregar materiales
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tbody>
          </table>
        </div>
      </React.Fragment>
    );
  }
}

export default table;