import React from "react";
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import CheckboxContainer from "../Rol/checkbox_container";

class formCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal returnFocusAfterClose={true} isOpen={this.props.modal} className="modal-lg modal-dialog-centered" toggle={this.props.toggle} backdrop={this.props.backdrop}>
          <ModalHeader className="title-modal" toggle={this.props.toggle}> <i className="app-menu__icon fa fa-street-view mr-2"></i> {this.props.titulo} </ModalHeader>

          <form onSubmit={this.props.FormSubmit}>
            <ModalBody>
            <div className="row">

                  <div className="col-md-12">
                    <label>Nombre <small className="validate-label">*</small></label>
                    <input
                      type="text"
                      name="name"
                      value={this.props.formValues.name}
                      onChange={this.props.onChangeForm}
                      className="form form-control"
                      autoComplete="off"
                      placeholder="Nombre"
                    />

                    <hr/>
                  </div>
                  


                  <div className="col-md-12">
                    <CheckboxContainer
                      checkedItems={this.props.checkedItems}
                      handleChangeAccions={this.props.handleChangeAccions}
                      checkboxes={this.props.checkboxes}
                      modules={this.props.modules}
                    />
                  </div>
            </div>

            </ModalBody>

            <ModalFooter>
                <button className="btn btn-light" onClick={this.props.toggle}>Cerrar</button>
                <button className="btn btn-secondary" onClick={this.props.submit}>{this.props.nameSubmit}</button>
            </ModalFooter>
          </form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default formCreate;
