import WebpackerReact from 'webpacker-react';
import React, { useState, useEffect } from 'react';
import FormCreate from '../components/Shifts/FormCreate';
import FormFilter from '../components/Shifts/FormFilter';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";

const Shifts = (props) => {
    const [data, setData] = useState([]);
    const [isLoaded, setIsLoaded] = useState(true);
    const token = document.querySelector("[name='csrf-token']").content;
    const [id, setId] = useState("");
    const [form, setForm] = useState({ end_date: "", start_date: "", cost_center_id: "", user_responsible_id: "" });
    const [formFilter, setFormFilter] = useState({ end_date: "", start_date: "", cost_center_id: "", user_responsible_id: "" });

    const [selectedOptionCostCenter, setSelectedOptionCostCenter] = useState({ cost_center_id: "", label: "Seleccione el centro de costo" });
    const [selectedOptionUser, setSelectedOptionUser] = useState({ user_responsible_id: "", label: "Seleccione el usuario responsable" });

    //modal state
    const [modal, setModal] = useState(false);
    const [modalFilter, setModalFilter] = useState(false);
    const [modeEdit, setModeEdit] = useState(false);

    const [errorValues, setErrorValues] = useState(true);
  
    useEffect(() => {
        loadData();
    }, []);



    const messageSuccess = (response) => {
        console.log("response", response);
        Swal.fire({
            position: "center",
            type: `${response.type}`,
            title: `${response.success}`,
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const updateItem = (page) => {
        setData(data.map(item => {
          if (item.id === page.id) {
            return { ...item, 
                end_date: page.end_date,
                start_date: page.start_date,
                cost_center: page.cost_center,
                user_responsible: page.user_responsible,
            }
          }
          return item;
        }));
    }

    const updateData = (new_item) => {
        setData([...data, new_item])
    }

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleChangeFilter = (e) => {
        setFormFilter({ ...formFilter, [e.target.name]: e.target.value })
    }

    const toogleFilter = (from) => {
        if (from == "new") {
            setModalFilter(true);
        } else {
            setModalFilter(false);
            clearValues();
        }
    }

    const handleClickFilter = () => {
        setIsLoaded(true);

        fetch(`/get_shifts?cost_center_id=${formFilter.cost_center_id}&user_responsible_id=${formFilter.user_responsible_id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            setIsLoaded(false);
            setData(data.data);
        });
    }

    const closeFilter = () => {
        setModalFilter(false);
        loadData();
    }

    const clearValues = () => {
        setForm({ end_date: "", start_date: "", cost_center_id: "", user_responsible_id: "" });
        setId("");
        setModeEdit(false);
        setErrorValues(true);
        setSelectedOptionUser({ user_responsible_id: "", label: "Seleccione el usuario responsable" });
        setSelectedOptionCostCenter({ cost_center_id: "", label: "Seleccione el centro de costo" });
    }

    const toogle = (from) => {
        if (from == "new") {
            setModal(true);
        } else {
            setModal(false);
            clearValues();
        }
    }

    const validationForm = () => {
        if (form.end_date != "" &&
            form.start_date != "" &&
            form.cost_center_id != "" &&
            form.user_responsible_id != "" 
        ) {
            setErrorValues(true)
            return true
        }else{
            setErrorValues(false)
            return false
        }
    }

    const handleClick = () => {
        if(validationForm()){
            if (!modeEdit)
                fetch(`/shifts`, {
                    method: 'POST', // or 'PUT'
                    body: JSON.stringify(form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": token,
                        "Content-Type": "application/json"
                    }
                })

                .then(res => res.json())
                .catch(error => console.error("Error:", error))
                .then(data => {
                    if(data.type == "success"){
                        setModal(false);
                        messageSuccess(data);
                        updateData(data.register);
                        clearValues();
                    }else{
                        messageSuccess(data);
                        clearValues();
                    }
                });
            else {
                fetch(`/shifts/${id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: JSON.stringify(form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": token,
                        "Content-Type": "application/json"
                    }
                })

                .then(res => res.json())
                .catch(error => console.error("Error:", error))
                .then(data => {
                    if(data.type == "success"){
                        setModal(false);
                        messageSuccess(data);
                        updateItem(data.register);
                        clearValues();
                    }else{
                        messageSuccess(data);
                        clearValues();
                    }
                });
            }
        }
    }

    const destroy = (page_id) => {
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
                fetch(`/shifts/${page_id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": token,
                        "Content-Type": "application/json"
                    }
                })
                .then(response => response.json())
                .then(response => {
                    messageSuccess(response);
                    loadData()
                });
            }
        })
    };

    const loadData = () => {
        fetch(`/get_shifts`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            setIsLoaded(false);
            setData(data.data);
        });
    }

    const handleChangeAutocompleteCostCenter = (selectedOptionCostCenter) => {
        setForm({ ...form, cost_center_id: selectedOptionCostCenter.value })
        setSelectedOptionCostCenter(selectedOptionCostCenter);
    }

    const handleChangeAutocompleteUser = (selectedOptionUser) => {
        setForm({ ...form, user_responsible_id: selectedOptionUser.value })
        setSelectedOptionUser(selectedOptionUser);
    }

    const edit = (shift) => {
        setForm({ end_date: shift.end_date, start_date: shift.start_date, cost_center_id: shift.cost_center.id, user_responsible_id: shift.user_responsible.id })
        setSelectedOptionUser({ user_responsible_id: shift.user_responsible.id, label: shift.user_responsible.names });
        setSelectedOptionCostCenter({ cost_center_id: shift.cost_center.id, label: shift.cost_center.code });
        setModal(true);
        setModeEdit(true);
        setId(shift.id);
    }

    return (
        <React.Fragment>
            {modal && (
                <FormCreate
                    backdrop={"static"}
                    modal={modal}
                    toggle={toogle}
                    title={modeEdit ? "Actualizar" : "Crear"}
                    nameBnt={modeEdit ? "Actualizar" : "Crear"}

                    //form props
                    formValues={form}
                    onChangeForm={handleChange}
                    submitForm={handleClick}
                    errorValues={errorValues}
                    microsoft_auth={props.microsoft_auth}

                    selectedOptionCostCenter={selectedOptionCostCenter}
                    handleChangeAutocompleteCostCenter={handleChangeAutocompleteCostCenter}
                    cost_centers={props.cost_centers}

                    selectedOptionUser={selectedOptionUser}
                    handleChangeAutocompleteUser={handleChangeAutocompleteUser}
                    users={props.users}
                />
            )}

            {modalFilter && (
                <FormFilter
                    formValues={formFilter}
                    handleChangeFilter={handleChangeFilter}
                    handleClickFilter={handleClickFilter}
                    closeFilter={closeFilter}
                    users={props.users}
                    cost_centers={props.cost_centers}
                />
            )}

            <div className="">
                <div className="tile">
                    <div className="col-md-12 text-right mb-3 pr-0">

                        {false && (
                            <button 
                                className="btn btn-primary ml-3"
                                onClick={() => toogleFilter("new")}
                            >
                                Filtros
                            </button> 
                        )}  

                        {true && (
                            <button 
                                className="btn btn-secondary ml-3"
                                onClick={() => toogle("new")}
                            >
                                Nuevo
                            </button>   
                        )}
                    </div>

                    <div className="tile-body">
                        {!isLoaded ? (
                            <table className="table table-hover table-bordered">
                                <thead>
                                    <tr className="tr-title">
                                        <th>Acciones</th>
                                        <th>Centro de costo</th>
                                        <th>Fecha inicial</th>
                                        <th>Fecha final</th>
                                        <th>Usuario responsable</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.length >= 1 ? (
                                        data.map(shift => (
                                            <tr key={shift.id}>
                                                {(true || true) && (
                                                    <td className="text-right" style={{ width: "10px"}}>          
                                                        <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
                                                            <div className="btn-group" role="group">
                                                                <button className="btn btn-secondary" id="btnGroupDrop1" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                                    <i className="fas fa-bars"></i>
                                                                </button>
                                                                            
                                                                <div className="dropdown-menu dropdown-menu-right">

                                                                    {true && (
                                                                        <button onClick={() => edit(shift)} className="dropdown-item">
                                                                            Editar
                                                                        </button>
                                                                    )}

                                                                    {true && (
                                                                        <button onClick={() => destroy(shift.id)} className="dropdown-item">
                                                                            Eliminar
                                                                        </button>
                                                                    )}
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </td>
                                                )}

                                                <td>{shift.cost_center.code}</td>
                                                <td>{shift.start_date}</td>
                                                <td>{shift.end_date}</td>
                                                <td>{shift.user_responsible.names}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <td colSpan="13" className="text-center">
                                            <div className="text-center mt-4 mb-4">
                                                <h4>No hay registros</h4>
                                            </div>
                                        </td>
                                    )}
                                </tbody>
                            </table>
                                 
                        ) : (
                            <div className="card">
                                <div className="card-body">
                                    <p>Cargando informacion...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default Shifts;
WebpackerReact.setup({ Shifts });
