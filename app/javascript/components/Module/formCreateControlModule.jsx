import React from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class formCreateControlModule extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal"  toggle={this.props.toggle}><i className="app-menu__icon fa fa-layer-group mr-2"></i> {this.props.titulo}</ModalHeader>
          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
              <div className="row">

                <div className="col-md-12 mb-4">
                  <label>Nombre <small className="validate-label">*</small></label>
                  <input
                    type="text"
                    name="name"
                    value={this.props.formValues.name}
                    onChange={this.props.onChangeForm}
                    className="form form-control"
                    placeholder="Nombre"
                    autoComplete="off"
                  />
    
                </div>

                <div className="col-md-12 mb-4">
                  <textarea
                    name="description"
                    rows="8"
                    value={this.props.formValues.description}
                    onChange={this.props.onChangeForm}
                    className="form form-control"
                    placeholder="Descripcion"
                  />
                </div>


              </div>

              </ModalBody>

         

          <ModalFooter>
                {this.props.errorState == true ? (
                  <div className="col-md-12 p-0">
                    <div className="alert alert-danger" role="alert">
                      <b>El nombre no puede estar en blanco</b>
                    </div>
                  </div>
                  ) : (
                  <React.Fragment>
                    <button className="btn btn-light" onClick={this.props.toggle}>Cerrar</button>
                    <button className="btn btn-secondary" onClick={this.props.submit}>{this.props.nameSubmit}</button>
                  </React.Fragment>
                )}  
              
          </ModalFooter>

          </form>

        </Modal>
      </div>
    );
  }
}

export default formCreateControlModule;

