import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';

class FormCreate extends Component {
    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered modal-lg" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                    <form onSubmit={this.handleSubmit}>
                        <ModalBody>
                            <div className="row">

                                <div className="col-md-12 mb-4">
                                    <label>Descripción</label>
                                    <textarea
                                        type="text"
                                        name="description"
                                        className={`form form-control`}
                                        value={this.props.formValues.description}
                                        onChange={this.props.onChangeForm}
                                        rows="6"
                                    />
                                </div>

                                <div className="col-md-12">
                                    <div className="row">
                                        <div className="col-md-4"></div>
                                        <div className="col-md-4"></div>

                                        <div className="col-md-4 mb-4">
                                            <label>Número de cotización *</label>
                                            <input 
                                                name="quotation_number"
                                                type="text"
                                                className={`form form-control`}
                                                value={this.props.formValues.quotation_number}
                                                onChange={this.props.handleChangeMoney}
                                                placeholder=""
                                            /> 
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-12 mt-4 mb-4">
                                    <hr/>
                                </div>

                                <div className="col-md-4">
                                    <label>Horas ingeniería *</label>
                                    <input 
                                        name="eng_hours"
                                        type="number"
                                        className={`form form-control`}
                                        value={this.props.formValues.eng_hours}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-4">
                                    <label>Valor hora costo *</label>
                                    <NumberFormat 
                                        name="hour_real"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.hour_real}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-4 mb-4">
                                    <label>Hora valor cotizada*</label>
                                    <NumberFormat 
                                        name="hour_cotizada"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.hour_cotizada}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-12 mt-4 mb-4">
                                    <hr/>
                                </div>

                                <div className="col-md-4">
                                    <label>Horas tablerista *</label>
                                    <input 
                                        name="hours_contractor"
                                        type="number"
                                        className={`form form-control`}
                                        value={this.props.formValues.hours_contractor}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-4">
                                    <label>Valor hora Costo*</label>
                                    <NumberFormat 
                                        name="hours_contractor_real"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.hours_contractor_real}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-4 mb-4">
                                    <label>Valor hora cotizada*</label>
                                    <NumberFormat 
                                        name="hours_contractor_invoices"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.hours_contractor_invoices}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-12 mt-4 mb-4">
                                    <hr/>
                                </div>

                                <div className="col-md-6">
                                    <label>Horas de desplazamiento*</label>
                                    <input 
                                        name="displacement_hours"
                                        type="number"
                                        className={`form form-control`}
                                        value={this.props.formValues.displacement_hours}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-6">
                                    <label>Valor hora de desplazamiento*</label>
                                    <NumberFormat 
                                        name="value_displacement_hours"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.value_displacement_hours}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-12 mt-4 mb-4">
                                    <hr/>
                                </div>
                                
                                <div className="col-md-4 mb-4">
                                    <label>Valor materiales *</label>
                                    <NumberFormat 
                                        name="materials_value"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.materials_value}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>


                                <div className="col-md-4">
                                    <label>Valor Viaticos*</label>
                                    <NumberFormat 
                                        name="viatic_value"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.viatic_value}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                                <div className="col-md-4">
                                    <label>Total Cotizacion*</label>
                                    <NumberFormat 
                                        name="quotation_value"
                                        thousandSeparator={true} 
                                        prefix={'$'} 
                                        className={`form form-control`}
                                        value={this.props.formValues.quotation_value}
                                        onChange={this.props.handleChangeMoney}
                                        placeholder="Valor hora costo"
                                    /> 
                                </div>

                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                            <button className="btn btn-secondary" onClick={() => this.props.submitForm()}>{this.props.nameBnt}</button>
                        </ModalFooter>
                    </form>
                </Modal>
            </React.Fragment>
        );
    }
}

export default FormCreate;