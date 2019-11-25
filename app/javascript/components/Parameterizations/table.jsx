import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../Parameterizations/FormCreate";
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
        name: "",
        money_value: "",
        user_id: this.props.usuario.id,
      },

      formUpdate: {
        name: "",
        money_value: "",
        user_id: this.props.usuario.id,
      }

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
              name: "",
              description: "",
              user_id: this.props.usuario.id
              
              
            },
          });
        });
    }
  };

  toggle(from) {
    if(from == "new"){
      this.setState({
        title: "Nueva Parametrizacion",
        form: {
          name: "",
          description: ""
        }
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

  handleChangeUpdate = e => {
    this.setState({
      formUpdate: {
        ...this.state.formUpdate,
        [e.target.name]: e.target.value
      }
    });
  };

  editTable = (accion) =>{
    this.setState({
      id: accion.id,
      formUpdate: {
        name: accion.name,
        money_value: accion.money_value,
        user_id: this.props.usuario.id,
      }
    })
  }

  updateInfo = () => {
    fetch("/parameterizations/" + this.state.id, {
      method: 'PATCH', // or 'PUT'
      body: JSON.stringify(this.state.formUpdate), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json())
      .catch(error => console.error('Error:', error))
      .then(data => {
        this.props.loadInfo()
        this.setState({
          id: "",
          formUpdate: {
            name: "",
            money_value: "",
            user_id: this.props.usuario.id,
          }
        });

      });
  }

  render() {
    return (
      <React.Fragment>
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

        

        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th>Nombre</th>
              <th>Valor monetario</th>
                {this.state.id != "" &&
                    <th></th>
                }
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                  <td>
                    {this.state.id == accion.id ? (
                        <input 
                            type="text" 
                            className="form form-control" 
                            name="name"
                            placeholder="Nombre"
                            onChange={this.handleChangeUpdate}
                            value={this.state.formUpdate.name}
                        />

                    ) : (
                        <p>{accion.name}</p>
                                  
                    )}
                  </td>
                  <td>
                    {this.state.id == accion.id ? (
                        <NumberFormat 
                            name="money_value"
                            thousandSeparator={true} 
                            prefix={'$'} 
                            className={`form form-control`}
                            value={this.state.formUpdate.money_value}
                            onChange={this.handleChangeUpdate}
                            placeholder="Valor total"
                        /> 
                    ) : (
                        <NumberFormat
                            value={accion.money_value}
                            displayType={"text"}
                            thousandSeparator={true}
                            prefix={"$"}
                        />
                                  
                    )}
                  </td>

                    {this.state.id != "" &&
                        <td style={{width: "118px"}}>
                        {this.state.id == accion.id && (
                                      <React.Fragment>
                                        <button className="btn btn-secondary" onClick={() => this.updateInfo()}>
                                          <i class="fas fa-check"></i>
                                        </button>
                                        <button className="btn btn-danger ml-2" onClick={() => this.setState({ id: ""})}>
                                          <i class="fas fa-times"></i>
                                        </button>
                                      </React.Fragment>
                                )}
                        </td>
                    }

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

                          {this.props.estados.edit == true &&(
                            <button
                              onClick={() => this.editTable(accion)}
                              className="dropdown-item"
                            >
                              Editar
                            </button>
                          )}
                            
                          {this.props.estados.delete == true &&(
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
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                      {this.props.estados.create == true &&(
                        <button className="btn btn-secondary mt-3" onClick={() => this.toggle("new")}>Nueva Parametrizacion</button>
                      )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        </div>
      </React.Fragment>
    );
  }
}

export default table;
