import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Select from "react-select";
import { CirclePicker } from 'react-color'

const FormCreate = (props) => {

    const handleSubmit = e => {
        e.preventDefault();
    };

    return (
        <React.Fragment>
            <Modal isOpen={props.modal} toggle={props.toggle} className="modal-dialog-centered modal-lg" backdrop={props.backdrop}>
                <ModalHeader className="title-modal" toggle={props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {props.title}</ModalHeader>

                {props.errors.length > 0 && (
                    <div className="alert alert-danger">
                        <div className="mb-2"> No se pudieron crear los registro ya que los siguientes usuarios tienen conflictos: </div>
                        {props.errors.map(value => (
                            <div className="mb-1">{value}</div>
                        ))}

                        <div className="col-md-4 text-center ui-showFormatCategories-RequiredSelect mt-2 mb-2 pl-0">
                            <input type="checkbox" onChange={(e) => props.onChangeForm({ target: { name: "force_save", value: !props.formValues.force_save } } )} className="custom-control-input" id={`customSwitch`} checked={props.formValues.force_save} />
                            <label className="custom-control-label" htmlFor={`customSwitch`}><b>¿Quieres forzar el guardado?</b></label>
                        </div>

                        {props.formValues.force_save && (
                            <b className="mt-3">El registro sera forzado, dale otravez al boton "Crear"</b>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        <div className="row">

                            <div className="col-md-6">
                                <div className="row">
                                    {true && (
                                        <div className="col-md-12 mb-3">
                                            <label>Fecha inicial</label>
                                            <input
                                                type="datetime-local"
                                                name="start_date"
                                                value={props.formValues.start_date}
                                                onChange={props.onChangeForm}
                                                className={`form form-control ${!props.errorValues && props.formValues.start_date == "" ? "error-class" : ""}`}
                                                placeholder="Nombre"
                                            />
                                        </div>
                                    )}

                                    <div className={`col-md-12 mb-3`}>
                                        <label>Fecha final</label>
                                        <input
                                            type="datetime-local"
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

                                    {!props.modeEdit && (
                                        <div className="col-md-12 mt-2 mb-3">
                                            <label>Usuarios que se les va a crear este turno</label>
                                            <input
                                                type="hidden"
                                                name="user_ids"
                                                value={props.selectedOptionMulti.user_ids}
                                            />

                                            <Select
                                                onChange={props.handleChangeAutocompleteMulti}
                                                options={props.users}
                                                isMulti
                                                closeMenuOnSelect={false}
                                                autoFocus={false}
                                                className={`link-form`}
                                                classNamePrefix="select"
                                                placeholder="Seleccione"
                                                name="user_ids"
                                                defaultValue={props.defaultValues}
                                            />
                                        </div>
                                    )}


                                    {props.modeEdit && (
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
                                    )}
                                </div>
                            </div>

                            <div className="col-md-6">

                                <div className={`col-md-12 mb-3`}>
                                    <label>Asunto</label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={props.formValues.subject}
                                        onChange={props.onChangeForm}
                                        className={`form form-control`}
                                        placeholder=""
                                    />
                                </div>

                                <div className={`col-md-12 mb-3`}>
                                    <textarea
                                        rows="11"
                                        className="form form-control"
                                        name="description"
                                        value={props.formValues.description}
                                        onChange={props.onChangeForm}
                                        placeholder="Descripcion"
                                    />
                                </div>

                                {props.formValues.color && (
                                    <div className="col-md-12 mt-4 mb-4">
                                        <span className="badge label-preview" style={{ backgroundColor: props.formValues.color }}>{props.str_label}</span>
                                    </div>
                                )}

                                <div className="col-md-12">
                                    <CirclePicker 
                                        color={props.formValues.color} 
                                        onChange={(color) => props.onChangeForm({ target: { name: "color", value: color.hex } } )} 
                                    />
                                </div>


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
        </React.Fragment >
    );
}


export default FormCreate;

