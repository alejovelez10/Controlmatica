import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Select from "react-select";

const FormCreate = (props) => {
    
    const handleSubmit = e => {
        e.preventDefault();
    };

    return (
        <React.Fragment>
            <Modal isOpen={props.modal} toggle={props.toggle} className="modal-dialog-centered" backdrop={props.backdrop}>
                <ModalHeader className="title-modal" toggle={props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {props.title}</ModalHeader>

                    <form onSubmit={handleSubmit}>
                        <ModalBody>
                            <div className="row">
                                {true && (
                                    <div className="col-md-6">
                                        <label>Fecha inicial</label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={props.formValues.start_date}
                                            onChange={props.onChangeForm}
                                            className={`form form-control ${!props.errorValues && props.formValues.start_date == "" ? "error-class" : ""}`}
                                            placeholder="Nombre"
                                        />
                                    </div>  
                                )}

                                <div className={`col-md-6 mb-3`}>
                                    <label>Fecha final</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={props.formValues.end_date}
                                        onChange={props.onChangeForm}
                                        className={`form form-control ${!props.errorValues && props.formValues.end_date == "" ? "error-class" : ""}`}
                                        placeholder="Nombre"
                                    />
                                </div>

                                <div className="col-md-12 mb-3">
                                    <input
                                        type="hidden"
                                        name="cost_center_id"
                                        value={props.selectedOptionCostCenter.cost_center_id}
                                    />                                                        
                                    <label>Centro de costo </label>
                                    <Select
                                        onChange={props.handleChangeAutocompleteCostCenter}
                                        options={props.cost_centers}
                                        autoFocus={false}
                                        className={`link-form ${!props.errorValues && props.formValues.cost_center_id == "" ? "error-class" : ""}`}
                                        value={props.selectedOptionCostCenter}
                                    />
                                </div>

                                <div className="col-md-12 mb-3">
                                    <input
                                        type="hidden"
                                        name="user_responsible_id"
                                        value={props.selectedOptionUser.user_responsible_id}
                                    />                                                        
                                    <label>Usuario responsable </label>
                                    <Select
                                        onChange={props.handleChangeAutocompleteUser}
                                        options={props.users}
                                        autoFocus={false}
                                        className={`link-form ${!props.errorValues && props.formValues.user_responsible_id == "" ? "error-class" : ""}`}
                                        value={props.selectedOptionUser}
                                    />
                                </div>

                                {props.microsoft_auth.is_user_logged_in && (
                                    <div className="col-md-12">
                                        <div className="tile pb-0">
                                            <div className="tile-body">
                                                <div className="row">
                                                    <div className="col-md-2">
                                                        <img class="rounded-circle" alt="avatar1" src={props.microsoft_auth.user_avatar} />
                                                    </div>

                                                    <div className="col-md-10">
                                                        <p><b>Nombre: </b> {props.microsoft_auth.username}</p>
                                                        <p><b>Email: </b> {props.microsoft_auth.user_email} </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <label className="btn btn-light mt-2" onClick={() => props.toggle()}>Cerrar</label>
                            <button className="btn-shadow btn btn-secondary" onClick={props.submitForm}>{props.nameBnt}</button>
                        </ModalFooter>
                    </form>
            </Modal>
        </React.Fragment>
    );
}


export default FormCreate;

