import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import FormCreateControlModule from "../Module/formCreateControlModule"



class Table extends React.Component {
  constructor(props){
    super(props)

    this.state = {
        modal: false,
        backdrop: "static",
        modeEdit: false,
        errorState: false,
        action: {},
        title: "Nuevo modulo",
        form: {
            name: "",
            description: "",
            user_id: this.props.usuario.id
        }
    }
    this.toggle = this.toggle.bind(this);
}

  MessageSucces = (name_success) => {
      Swal.fire({
        position: 'center',
        type: 'success',
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
        },
        
        errorState: false

      });
  };

  HandleClick = e => {
    if (this.state.form.name == "") {
      this.setState({
        errorState: true
      })
    }else{
      if(this.state.modeEdit == true){
        
        fetch("/module_controls/" + this.state.action.id, {
          method: 'PATCH', // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            'Content-Type': 'application/json',
          }
        }).then(res => res.json())
          .catch(error => console.error('Error:', error))
          .then(response => {
            this.props.loadInfo()
            this.MessageSucces(response.message)

            this.setState({
              modal: false,
              form: {
                name: "",
                description: "",
                user_id: this.props.usuario.id
              }
            });

          });

      }else{
        fetch("/module_controls", {
          method: 'POST', // or 'PUT'
          body: JSON.stringify(this.state.form), // data can be `string` or {object}!
          headers: {
            'Content-Type': 'application/json',
          }
          
        })
          .then(res => res.json())
          .catch(error => console.error("Error:", error))
          .then(data => {
            this.props.loadInfo()

            this.MessageSucces("¡El Registro fue creado con exito!")

            this.setState({
              modal: false,
              form: {
                name: "",
                description: "",
                user_id: this.props.usuario.id
              }
            });
          });
      }

    }
        
  };


  edit = modulo => {
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")

      this.setState({
        action: modulo,
        title: "Editar a " + modulo.name,
        form:{
            name: modulo.name,
            description: modulo.description
          }
          
        }
        
      )
      
  };


  toggle(from) {
    if(from == "edit"){
      this.setState({modeEdit: true})
      
    }else if(from == "new"){

      this.setState({
        modeEdit: false ,
        title: "Nuevo modulo",
        form: {
          name: "",
          description: ""
        }
      })

    }else{
      this.setState({ errorState: false })
      if(this.state.modeEdit === true){
        this.setState({modeEdit: false})
      }else{
        this.setState({modeEdit: true})
      }

    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }


  delete = (id) => {
    Swal.fire({
      title: 'Estas seguro?',
      text: "El registro sera eliminado para siempre!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#009688',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si'
    }).then((result) => {
      if (result.value) {
        fetch("/module_controls/" + id, {
          method: 'delete'
      }).then(response => response.json())
      .then(response => {
        this.props.loadInfo()
        
        Swal.fire(
          'Borrado!',
          '¡El registro fue eliminado con exito!',
          'success'
        )
      });
      }
    })

  }


  render() {
    return (
        <React.Fragment>
 
            <div className="col-md-12 p-0 mb-4">
              {this.props.estados.create == true && (
                <button className="btn btn-secondary float-right" color="danger" onClick={() => this.toggle("new")}>Nuevo modulo</button>
              )}
            </div>

            <br/><br/>

            <FormCreateControlModule

                toggle={this.toggle}
                backdrop={this.state.backdrop}
                modal={this.state.modal}

                onChangeForm={this.handleChange}
                formValues={this.state.form}
                submit={this.HandleClick}
                FormSubmit={this.handleSubmit}

                titulo={this.state.title}
                nameSubmit={this.state.modeEdit == true ? "Actualizar" : "Crear"}
                errorState={this.state.errorState}
              
            />

            <div className="content">
            
              <table
                className="table table-hover table-bordered"
                id="sampleTable"
              >
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                
                <tbody>
                  {this.props.dataActions.length >= 1 ? (
                    this.props.dataActions.map(accion => (
                      <tr key={accion.id}>
                        <td>{accion.name}</td>
                        <td>{accion.description}</td>
  
                        <td className="text-right" style={{ width: "10px"}}>          
                          <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                            <div className="btn-group" role="group">
                              <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                              <i className="fas fa-bars"></i>
                              </button>
                              
                              <div className="dropdown-menu dropdown-menu-right">
                              {this.props.estados.gestionar == true && (
                                <a href={`/module_controls/${accion.id}`} className="dropdown-item">
                                  Gestionar
                                </a>
                              )} 
                              
                              {this.props.estados.edit == true && (
                                <button onClick={() => this.edit(accion)} className="dropdown-item">
                                  Editar
                                </button>
                              )} 
                              
                              {this.props.estados.delete == true && (
                                <button onClick={() => this.delete(accion.id)} className="dropdown-item">
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
                        <div className="text-center mt-4 mb-4">
                        <h4>No hay registros</h4>
                        {this.props.estados.create == true && (
                          <button className="btn btn-secondary mt-3" onClick={() => this.toggle("new")}>Nueva modulo</button>
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

export default Table;
