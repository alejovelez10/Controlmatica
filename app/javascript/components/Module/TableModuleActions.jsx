import React from 'react';
import FormCreateControlModule from "../Module/formCreateControlModule"
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";


class TableModuleActions extends React.Component {

    constructor(props){
        super(props)

        this.state = {
            modal: false,
            backdrop: "static",
            modeEdit: false,
            errorState: false,
            action: {},
            title: "Nueva accion",
            form: {
                name: "",
                description: "",
                user_id: this.props.usuario.id,
                module_control_id: this.props.modulo.id
            }
        }

        this.toggle = this.toggle.bind(this);
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
          
          fetch("/accion_modules/" + this.state.action.id, {
            method: 'PATCH', // or 'PUT'
            body: JSON.stringify(this.state.form), // data can be `string` or {object}!
            headers: {
              'Content-Type': 'application/json',
            }
          }).then(res => res.json())
            .catch(error => console.error('Error:', error))
            .then(data => {
  
              this.props.loadInfo()
              this.MessageSucces(data.message, data.type, data.message_error)
    
              this.setState({
                modal: false,
                form: {
                  name: "",
                  description: "",
                  user_id: this.props.usuario.id,
                  module_control_id: this.props.modulo.id
                }
              });
    
            });
    
        }else{

          
          fetch("/accion_modules", {
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
    
              this.MessageSucces(data.message, data.type, data.message_error)
    
              this.setState({
                modal: false,
                form: {
                  name: "",
                  description: "",
                  user_id: this.props.usuario.id,
                  module_control_id: this.props.modulo.id
                }
              });
            });
        }


      }
          
    };

    toggle(from) {
      if(from == "edit"){
        this.setState({modeEdit: true})
        
      }else if(from == "new"){
  
        this.setState({
          modeEdit: false ,
          title: "Nueva accion",
          form: {
            name: "",
            description: "",
            user_id: this.props.usuario.id,
            module_control_id: this.props.modulo.id
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
  


    edit = accion_register => {    
      if(this.state.modeEdit === true){
        this.setState({modeEdit: false})
      }else{
        this.setState({modeEdit: true})
      }
  
      this.toggle("edit")

        this.setState({
          action: accion_register,
          title: "Editar a " + accion_register.name,
          form:{
              name: accion_register.name,
              description: accion_register.description,
              user_id: this.props.usuario.id
            }
            
          }
          
        )
        
      };

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
            fetch("/accion_modules/" + id, {
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
            <div className="tile">

              <FormCreateControlModule

              toggle={this.toggle}modal
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

            <div className="col-md-12 p-0 mb-4">
            <button className="btn btn-secondary float-right" color="danger" onClick={() => this.toggle("new")}>Nueva accion</button>
            </div>
            <br/><br/>

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

                              <button onClick={() => this.edit(accion)} className="dropdown-item">
                                Editar
                              </button>

                              <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                Eliminar
                              </button>
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
                          <button className="btn btn-secondary mt-3" color="danger" onClick={() => this.toggle("new")}>Nueva accion</button>
                      </div>
                  </td>
                )}
                
              </tbody>

            </table>
          </div>

            </div>
        );
    }
}

export default TableModuleActions;
