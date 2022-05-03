import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class FormCreate extends Component {
    constructor(props) {
        super(props)
        this.state = {
            color_min: false,
            color_mid: false,
            color_max: false,

            color_hour_min: false, 
            color_hour_med: false, 
            color_hour_max: false, 
        }
    }

    handleSubmit = e => {
        e.preventDefault();
    };

    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-lg modal-dialog-centered" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                    <form onSubmit={this.handleSubmit}>
                        <ModalBody>
                            <div className="row">

                                <div className="col-md-12">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={this.props.formValues.name}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Ingenieria Ejecucion (Valor mmaximo en verde)</label>
                                    <input
                                        type="number"
                                        name="ing_ejecucion_min"
                                        value={this.props.formValues.ing_ejecucion_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Ingenieria Ejecucion (Valor maximo en Naranja)</label>
                                    <input
                                        type="number"
                                        name="ing_ejecucion_med"
                                        value={this.props.formValues.ing_ejecucion_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4">
                                    <label>Ingenieria Costo (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="ing_costo_min"
                                        value={this.props.formValues.ing_costo_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Ingenieria Costo (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="ing_costo_med"
                                        value={this.props.formValues.ing_costo_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4">
                                    <label>Tablerista Ejecucion (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="tab_ejecucion_min"
                                        value={this.props.formValues.tab_ejecucion_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Tablerista Ejecucion (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="tab_ejecucion_med"
                                        value={this.props.formValues.tab_ejecucion_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>


                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4">
                                    <label>Tablerista Costo (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="tab_costo_min"
                                        value={this.props.formValues.tab_costo_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Tablerista Costo (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="tab_costo_med"
                                        value={this.props.formValues.tab_costo_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4">
                                    <label>Desplazamiento (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="desp_min"
                                        value={this.props.formValues.desp_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>


                                <div className="col-md-6 mt-4">
                                    <label>Desplazamiento (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="desp_med"
                                        value={this.props.formValues.desp_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Materiales (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="mat_min"
                                        value={this.props.formValues.mat_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Materiales (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="mat_med"
                                        value={this.props.formValues.mat_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4">
                                    <label>Viaticos (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="via_min"
                                        value={this.props.formValues.via_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4">
                                    <label>Viaticos (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="via_med"
                                        value={this.props.formValues.via_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-12 mt-4"><hr /></div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Total (Valor maximo en verde)</label>
                                    <input
                                        type="number"
                                        name="total_min"
                                        value={this.props.formValues.total_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Total (Valor maximo en naranja)</label>
                                    <input
                                        type="number"
                                        name="total_med"
                                        value={this.props.formValues.total_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>
                                
                                <hr />
                                
                                <div className="col-md-12 mt-2 mb-2">
                                    <h4 className="text-center title-alert">Configuración de horas por mes</h4>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Menor o igual(Valor)</label>
                                    <input
                                        type="number"
                                        name="alert_min"
                                        value={this.props.formValues.alert_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_min" >Color</button>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Mayor que valor anterior y menor que</label>
                                    <input
                                        type="number"
                                        name="alert_med"
                                        value={this.props.formValues.alert_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_mid">Color</button>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>Mayor o igual al valor anterior</label>
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_max">Color</button>
                                </div>


                                <div className="col-md-12 mt-2 mb-2">
                                    <h4 className="text-center title-alert">Configuración horas por día</h4>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>alert_hour_min</label>
                                    <input
                                        type="number"
                                        name="alert_hour_min"
                                        value={this.props.formValues.alert_hour_min}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_hour_min" >Color color_hour_min</button>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>alert_hour_med</label>
                                    <input
                                        type="number"
                                        name="alert_hour_med"
                                        value={this.props.formValues.alert_hour_med}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_hour_med">Color color_hour_med</button>
                                </div>

                                <div className="col-md-6 mt-4 mb-4">
                                    <label>alert_hour_max</label>
                                    <input
                                        type="number"
                                        name="alert_hour_max"
                                        value={this.props.formValues.alert_hour_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                    />
                                </div>

                                <div className="col-md-6 mt-4 mb-4 text-center">
                                    <button className="btn btn-secondary btn-block color_mid">Color color_hour_max</button>
                                </div>



                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                            <button className="btn btn-secondary" onClick={this.props.submitForm}>{this.props.nameSubmit}</button>
                        </ModalFooter>
                    </form>
                </Modal>
            </React.Fragment>
        );
    }
}

export default FormCreate;