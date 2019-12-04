import React from "react";
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Select from "react-select";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show_password: false,
      show_password_confirmation: false
    }
  }


  getUrl(){
    if (this.props.editState == true) {
      
      if (this.props.formValues.avatar == undefined) {
        return <img src="https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg" className="img-user-create" alt=""/>
      }else{
        return <img src={this.props.formValues.avatar} className="img-user-create" alt=""/>
      }
     
     
    }else{
      return <img src="https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg" className="img-user-create" alt=""/>
    }

  }


  render() {
    return (

      <React.Fragment>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.titulo}</ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
              <div className="row">

                <div className="col-md-8">
                  <div className="row">

                    <div className="col-md-6 mb-4">
                      <label>Nombre y apellido <small className="validate-label">*</small></label>
                        <input
                          type="text"
                          name="names"
                          value={this.props.formValues.names}
                          onChange={this.props.onChangeForm}
                          className={`form form-control ${this.props.errorValues == false && this.props.formValues.names == "" ? "error-class" : ""}`}
                          placeholder="Nombre completo"
                        />
                    </div>

                    <div className="col-md-6 mb-4">
                      <label>Correo electrónico <small className="validate-label">*</small></label>

                      <input
                        type="email"
                        name="email"
                        value={this.props.formValues.email}
                        onChange={this.props.onChangeForm}
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.email == "" ? "error-class" : ""}`}
                        placeholder="Correo"
                      />
                    </div>

                    <div className="col-md-6 mb-4">
                      <label>Tipo de documento <small className="validate-label">*</small></label>
                        <select 
                          name="document_type"
                          className={`form form-control ${this.props.errorValues == false && this.props.formValues.document_type == "" ? "error-class" : ""}`}
                          value={this.props.formValues.document_type}
                          onChange={this.props.onChangeForm}
                        >
                          <option value="">Seleccione un tipo</option>
                          <option value="Cédula de Ciudadanía">Cédula de Ciudadanía</option>
                          <option value="Tarjeta de Identidad">Tarjeta de Identidad</option>
                          <option value="Registro Civil de Nacimiento">Registro Civil de Nacimiento</option>
                          <option value="Cedula de Extranjeria">Cédula de Extranjeria</option>
                          <option value="Pasaporte">Pasaporte</option>
                          <option value="Menor sin Identificación">Menor sin Identificación</option>
                          <option value="Adulto sin Identificación">Adulto sin Identificación</option>
                          <option value="Carnet Diplomático">Carnet Diplomático</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-4">
                      <label>Numero de documento <small className="validate-label">*</small></label>
                      <input
                        type="number"
                        name="number_document"
                        value={this.props.formValues.number_document}
                        onChange={this.props.onChangeForm}
                        className={`form form-control ${this.props.errorValues == false && this.props.formValues.number_document == "" ? "error-class" : ""}`}
                        placeholder="Documento"
                      />
                    </div>

                    <div className="col-md-12 mb-4">
                      <input
                        type="hidden"
                        name="rol_id"
                        value={this.props.formAutocomplete.rol_id}
                      />
                      <label>Rol <small className="validate-label">*</small></label>
                      <Select
                        onChange={this.props.onChangeAutocomplete}
                        options={this.props.roles}
                        autoFocus={false}
                        className={`link-form ${this.props.errorValues == false && this.props.formValues.rol_id == "" ? "error-class" : ""}`}
                        value={this.props.formAutocomplete}
                      />
                    </div>



                  </div>
                </div>

                <div className="col-md-4 text-center">

                  <p>{this.getUrl()}</p>

                  <input
                    type="file"
                    name="avatar"
                    onChange={this.props.handleFileUpload}
                    className="form form-control"
                    placeholder="Nombre completo"
                  /> 
 
                </div>

                <div className="col-md-12 mt-4">
                  <div className="row">

                    <div className="col-md-6">
                        <label>Contraseña <small className="validate-label">*</small></label>
                        <input
                          type={this.state.show_password == false ? "password" : "text"}
                          name="password"
                          value={this.props.formValues.password}
                          onChange={this.props.onChangeForm}
                          onBlur={this.props.onBlurPasswordConfirmation}
                          className="form form-control"
                          placeholder="Contraseña"
                        />

                        {this.props.formValues.password.length >= 1 && (
                          <label className="btn-password" onClick={() => this.state.show_password == false  ? this.setState({ show_password: true }) : this.setState({ show_password: false }) }>{this.state.show_password == false ? <i className ="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i> }</label>
                        )}  

                    </div>

                    <br />

                    <div className="col-md-6">
                    <label>Confirmar contraseña <small className="validate-label">*</small></label>
                        <input
                          type={this.state.show_password_confirmation == false ? "password" : "text"}
                          name="password_confirmation"
                          value={this.props.formValues.password_confirmation}
                          onChange={this.props.onChangeForm}
                          onBlur={this.props.onBlurPasswordConfirmation}
                          className="form form-control"
                          placeholder="Nombre"
                          placeholder="Confirmar contraseña"
                        />

                        {this.props.formValues.password_confirmation.length >= 1 && (
                          <label className="btn-password" onClick={() => this.state.show_password_confirmation == false  ? this.setState({ show_password_confirmation: true }) : this.setState({ show_password_confirmation: false }) }>{this.state.show_password_confirmation == false ? <i className ="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}</label>
                        )}  
                    </div>

                  </div>
                </div>

                  {this.props.formValues.password.length >= 1 && (
                    <React.Fragment>
                      {this.props.passworState == false && (
                        <div className="col-md-12 mt-1">
                          <div className="alert alert-danger" role="alert">
                          <p>Requerido de contraseña</p>

                            <div className="row">
                              <div className="col-md-6">
                                <ul>
                                  <li className={this.props.formValues.password.length > 10 ? "color-password" : "color-falsePassword"}>Mínimo 10 caracteres</li>
                                  <li className={(/[A-Z]/).test(this.props.formValues.password) ? "color-password" : "color-falsePassword"}>Al menos una letra mayúscula</li>
                                  <li className={(/[a-z]/).test(this.props.formValues.password) ? "color-password" : "color-falsePassword"}>Una letra minúscula</li>
                                  <li className={(/[0-9]/).test(this.props.formValues.password) ? "color-password" : "color-falsePassword"}>Un número</li>
                                  <li className={(/[@$!%*?]/).test(this.props.formValues.password) ? "color-password" : "color-falsePassword"}>Un carácter especial(@$!%*?)</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  )}

                {this.props.passworState == true && this.props.formValues.password.length >= 1 && this.props.formValues.password_confirmation.length >= 1 &&(
                  <React.Fragment>
                      <div className="col-md-12">
                        <div className={this.props.passworConfirmationState == false ? "alert alert-danger" : "alert alert-primary"} role="alert">
                          <b>{this.props.passworConfirmationState == false ? "La confirmacion de la contraseña no es igual a la contraseña " : "Contraseñas iguales"}</b>
                        </div>
                      </div>
                  </React.Fragment>
                )}

            

                {this.props.errorValues == false && (
                  <div className="col-md-12 mt-4">
                    <div className="alert alert-danger" role="alert">
                      <b>Debes de completar todos los campos requerios</b>
                    </div>
                  </div>
                )}


              </div>

              
            </ModalBody>

        
          <ModalFooter>
                <label className="btn btn-light mt-2" onClick={this.props.toggle}>Cerrar</label>
                <button className="btn btn-secondary" onClick={this.props.submit}>{this.props.nameSubmit}</button>
          </ModalFooter>

          </form>




        </Modal>
      </React.Fragment>
     
    );
  }
}

export default FormCreate;

