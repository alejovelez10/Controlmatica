import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../CustomerReports/FormCreate";
import NumberFormat from "react-number-format";

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      title: "",
      modal: false,
      backdrop: "static",
      ErrorValues: true,
      action: {},
      id: "",

      form: {
        customer_id: "",
        cost_center_id: "",
        contact_id: "",
        report_date: "",
        description: "",
        report_ids: "",
        user_id: this.props.usuario.id,
      },

    };

    this.toggle = this.toggle.bind(this);
  }

  validationForm = () => {
    if (this.state.form.name != "" && 
        this.state.form.money_value != "" 
        ) {
          console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValues: false })
      return false
      
    }
  }


  openModal(name) {
    if (name == "edit") {
      this.setState({
        modeEdit: false
      });
    } else {

      this.setState({
        title: "Nuevo rol",
        modeEdit: false,
        form: {
          name: "",
          description: "",
          user_id: this.props.usuario.id,
          accion_module_ids: []
        }
      });
    }

    this.setState({
      modalIsOpen: true
    });
  }

  MessageSucces = (name_success, type, error_message) => {
        Swal.fire({
        position: "center",
        type: type,
        html: '<p>'  + error_message !=  undefined ? error_message : "asdasdasd"  +  '</p>',
        title: name_success,
        showConfirmButton: false,
        timer: 1500
        });
    }

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

  HandleClick = e => {
    if (this.validationForm() == true) {
      fetch("/parameterizations", {
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

          this.MessageSucces(data.message, data.type, data.message_error)

          this.setState({
            modal: false,
            form: {
                customer_id: "",
                cost_center_id: "",
                contact_id: "",
                report_date: "",
                description: "",
                report_ids: "",
                user_id: this.props.usuario.id,
              },
          });
        });
    }
  };

  toggle(from) {
    if(from == "new"){
      this.setState({
        title: "Nuevo Informe",
        form: {
            customer_id: "",
            cost_center_id: "",
            contact_id: "",
            report_date: "",
            description: "",
            report_ids: "",
            user_id: this.props.usuario.id,
          },
      })
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
        fetch("/parameterizations/" + id, {
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

  sendReques = (accion) => {
    Swal.fire({
        title: "Estas seguro?",
        text: "Al aceptar se enviara el correo al cliente!",
        type: "info",
        showCancelButton: true,
        confirmButtonColor: "#009688",
        cancelButtonColor: "#d33",
        confirmButtonText: "Si"
      }).then(result => {
        if (result.value) {
          fetch(`/enviar_aprobacion/${accion.id}`, {
            method: "GET"
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
  }


  render() {
    return (
      <div className="tile">
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
        />

        <div className="row mb-4">
            <div className="col-md-12">
                <div className="row">
                    <div className="col-md-8">

                    </div>

                    <div className="col-md-4 text-right">
                        <button className="btn btn-secondary" onClick={() => this.toggle("new")}>Nuevo Informe</button>
                    </div>
                </div>
            </div>
        </div>

        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th>Creado</th>
              <th>Codigo</th>
              <th>Descripcion</th>
              <th style={{width: "220px"}}>Token</th>
              <th>Estado</th>
              <th>Fecha Aprobacion</th>
              <th>Cliente</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                    <td>{accion.report_date}</td>
                    <td>{accion.report_code}</td>
                    <td>{accion.description}</td>
                  <td> 
                    <button
                        onClick={() => this.sendReques(accion)}
                        className="btn btn-success"
                        style={{width: "220px"}}
                    >
                        Enviar para Aprobaciòn
                    </button>
                  </td>

                  <td>{accion.report_state}</td>
                  <td>{accion.approve_date}</td>
                  <td>{accion.customer.name}</td>


                  <td className="text-right" style={{ width: "10px" }}>
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

                            <a
                              href={`/customer_reports/${accion.id}`}
                              className="dropdown-item"
                            >
                              Ver registro
                            </a>

                            <a
                              href={`/customer_reports/${accion.id}/edit`}
                              className="dropdown-item"
                            >
                              Editar
                            </a>

                            <button
                              onClick={() => this.delete(accion.id)}
                              className="dropdown-item"
                            >
                              Eliminar
                            </button>

                            <a
                              href={`/customer_pdf/${accion.id}.pdf`}
                              className="dropdown-item"
                              target="_blank"
                            >
                              Generar pdf
                            </a>

                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                        <button className="btn btn-secondary mt-3" onClick={() => this.toggle("new")}>Nuevo Informe</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        </div>
      </div>
    );
  }
}

export default table;
