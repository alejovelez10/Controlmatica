import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class FormCreate extends Component {

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
                                {/*           <div className="col-md-4 mt-4 mb-4">
                                        <label>Ingenieria Ejecucion Maximo</label>
                                        <input
                                            type="number"
                                            name="ing_ejecucion_max"
                                            value={this.props.formValues.ing_ejecucion_max}
                                            onChange={this.props.onChangeForm}
                                            className={`form form-control`}
                                            placeholder="Ingenieria Ejecucion Maximo"
                                        />
                                    </div> */}


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

                                {/*                                 <div className="col-md-4 mt-4 mb-4">
                                    <label>Ingenieria Costo Maximo</label>
                                    <input
                                        type="number"
                                        name="ing_costo_max"
                                        value={this.props.formValues.ing_costo_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                        placeholder="Ingenieria Costo Maximo"
                                    />
                                </div> */}

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

                                {/* 
                                <div className="col-md-4 mt-4 mb-4">
                                    <label>Tablerista Costo Maximo</label>
                                    <input
                                        type="number"
                                        name="tab_costo_max"
                                        value={this.props.formValues.tab_costo_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                        placeholder="Tablerista Costo Maximo"
                                    />
                                </div> */}
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

                                {/*                                 <div className="col-md-4 mt-4">
                                    <label>Desplazamiento Maximo</label>
                                    <input
                                        type="number"
                                        name="desp_max"
                                        value={this.props.formValues.desp_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                        
                                    />
                                </div> */}

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

                                {/*                                 <div className="col-md-4 mt-4 mb-4">
                                    <label>Materiales Maximo</label>
                                    <input
                                        type="number"
                                        name="mat_max"
                                        value={this.props.formValues.mat_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                        
                                    />
                                </div> */}
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
                                {/* 
                                <div className="col-md-4 mt-4 mb-4">
                                    <label>Viaticos Maximo</label>
                                    <input
                                        type="number"
                                        name="via_max"
                                        value={this.props.formValues.via_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}
                                       
                                    />
                                </div> */}
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
                                {/* 
                                <div className="col-md-4">
                                    <label>Total Maximo</label>
                                    <input
                                        type="number"
                                        name="tatal_max"
                                        value={this.props.formValues.tatal_max}
                                        onChange={this.props.onChangeForm}
                                        className={`form form-control`}

                                    />
                                </div> */}

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