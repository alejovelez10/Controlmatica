import WebpackerReact from 'webpacker-react';
import React, { useState, useEffect } from 'react';
import FormCreate from '../components/Shifts/FormCreate';
import FormFilter from '../components/Shifts/FormFilter';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2";

const Shifts = (props) => {
    const date = new Date()
    const start_date = `${date.getFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}T${date.getHours()}:${date.getMinutes()}`

    const [data, setData] = useState([]);
    const [isLoaded, setIsLoaded] = useState(true);
    const token = document.querySelector("[name='csrf-token']").content;
    const [id, setId] = useState("");

    const [str_label, setStrLabel] = useState("");
    const [errors_create, setErrorsCreate] = useState([]);

    // AJAX cost center search state
    const [costCenterOptions, setCostCenterOptions] = useState([]);
    const [costCenterLoading, setCostCenterLoading] = useState(false);


    const [defaultValues, setDefaultValues] = useState([]);
    const [form, setForm] = useState({ end_date: "", start_date: start_date, cost_center_id: "", description: "", subject: "", user_responsible_id: "", user_ids: [], color: "#1aa9fb", force_save: false });
    const [formFilter, setFormFilter] = useState({ end_date: "", start_date: "", cost_center_ids: [], user_responsible_ids: [] });

    const [selectedOptionCostCenter, setSelectedOptionCostCenter] = useState({ cost_center_id: "", label: "Seleccione el centro de costo" });
    const [selectedOptionUser, setSelectedOptionUser] = useState({ user_responsible_id: "", label: "Seleccione el usuario responsable" });
    const [selectedOptionMulti, setSelectedOptionMulti] = useState({ user_ids: [], label: "Seleccione los usuarios" });

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
                users: page.users,
                description: page.description,
                subject: page.subject,
                color: page.color,
                force_save: page.force_save,
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

    const clearValuesFilter = () => {
        setFormFilter({ end_date: "", start_date: "", cost_center_ids: [], user_responsible_ids: [] });
    }

    const toogleFilter = (from) => {
        if (from == "new") {
            setModalFilter(true);
        } else {
            setModalFilter(false);
            clearValuesFilter();
        }
    }

    const handleClickFilter = () => {
        setIsLoaded(true);

        fetch(`/get_shifts?start_date=${formFilter.start_date}&end_date=${formFilter.end_date}&cost_center_ids=${formFilter.cost_center_ids}&user_responsible_ids=${formFilter.user_responsible_ids}`, {
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
        clearValuesFilter();
        loadData();
    }

    const clearValues = () => {
        setForm({ end_date: start_date, start_date: "", cost_center_id: "", user_responsible_id: "", color: "#1aa9fb", force_save: false });
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
            form.cost_center_id != "" 
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
                    if (!data.force_save) {
                        setErrorsCreate(data.errors);
                    }else{
                        setModal(false);
                        messageSuccess(data);
                        loadData();
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
            title: '¿Estas seguro?',
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
                    setId("");
                    setModal(false);
                    setModeEdit(false);
                    clearValues();
                    setStrLabel("");
                    messageSuccess(response);
                    loadData();
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
        setSelectedOptionCostCenter(selectedOptionCostCenter);
        getDescriptionCostCenter(selectedOptionCostCenter.value);
        setStrLabel(`${selectedOptionCostCenter.label} - ${props.current_user_name}`);
    }

    const getDescriptionCostCenter = (cost_center_id) => {
        fetch(`/get_cost_center_description/${cost_center_id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            setForm({ ...form, subject: data.register.description, cost_center_id: data.register.id })
        });
    }

    const handleChangeAutocompleteUser = (selectedOptionUser) => {
        setForm({ ...form, user_responsible_id: selectedOptionUser.value })
        setSelectedOptionUser(selectedOptionUser);
    }

    // AJAX search for cost centers
    const handleCostCenterSearch = (inputValue) => {
        if (inputValue.length < 2) {
            setCostCenterOptions([]);
            return;
        }
        setCostCenterLoading(true);
        fetch(`/shifts/search_cost_centers?q=${encodeURIComponent(inputValue)}`, {
            method: 'GET',
            headers: {
                "X-CSRF-Token": token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            setCostCenterOptions(data);
            setCostCenterLoading(false);
        })
        .catch(() => {
            setCostCenterLoading(false);
        });
    };

    const handleChangeAutocompleteMulti = selectedOptionMulti => {
        let array = []

        if(selectedOptionMulti){
            selectedOptionMulti.map((item) => (
                array.push(item.value)
            ))
        }

        setForm({ 
            ...form, 
            user_ids: selectedOptionMulti ? array : [],
        })
    }

    const digits_count = (n) => {
        var count = 0;
        if (n >= 1) ++count;
      
        while (n / 10 >= 1) {
          n /= 10;
          ++count;
        }
      
        return count;
    }

    const getDate = (register_date) => {
        let date = new Date(register_date)
        let mins = ('0' + date.getMinutes()).slice(-2);
        let date_month = ("0" + (date.getMonth() + 1)).slice(-2)
        let day = ("0" + (date.getDate())).slice(-2)
        let hours = ('0'+date.getUTCHours()).slice(-2);
        let new_date = `${date.getFullYear()}-${date_month}-${day}T${hours}:${mins}`
        return new_date
    }

    const edit = (shift) => {
        const arrayIds = [];
    
        shift.users.map((user) => (
            arrayIds.push(user.value)
        ))    

        setStrLabel(`${shift.cost_center.code} - ${props.current_user_name}`)
        
        setForm({ end_date: getDate(shift.end_date), start_date: getDate(shift.start_date), description: shift.description, subject: shift.subject, cost_center_id: shift.cost_center.id, user_responsible_id: (shift.user_responsible ? shift.user_responsible.id : ""), user_ids: arrayIds, color: shift.color, force_save: shift.force_save })
        setSelectedOptionUser({ user_responsible_id: (shift.user_responsible ? shift.user_responsible.id : ""), label: (shift.user_responsible ? shift.user_responsible.names : "Seleccione el usuario responsable") });
        setSelectedOptionCostCenter({ cost_center_id: shift.cost_center.id, label: shift.cost_center.code });
        setModal(true);
        setModeEdit(true);
        setId(shift.id);
        setDefaultValues(shift.users);
    }

    return (
        <React.Fragment>
            {modal && (
                <FormCreate
                    backdrop={"static"}
                    modal={modal}
                    toggle={toogle}
                    title={modeEdit ? "Actualizar turno" : "Crear turno"}
                    nameBnt={modeEdit ? "Actualizar" : "Crear"}
                    modeEdit={modeEdit}

                    //form props
                    formValues={form}
                    onChangeForm={handleChange}
                    submitForm={handleClick}
                    errorValues={errorValues}
                    microsoft_auth={props.microsoft_auth}
                    str_label={str_label}
                    errors={errors_create}

                    selectedOptionCostCenter={selectedOptionCostCenter}
                    handleChangeAutocompleteCostCenter={handleChangeAutocompleteCostCenter}
                    cost_centers={costCenterOptions}
                    onCostCenterSearch={handleCostCenterSearch}
                    costCenterLoading={costCenterLoading}

                    selectedOptionUser={selectedOptionUser}
                    handleChangeAutocompleteUser={handleChangeAutocompleteUser}
                    users={props.users}

                    handleChangeAutocompleteMulti={handleChangeAutocompleteMulti}
                    selectedOptionMulti={selectedOptionMulti}
                    defaultValues={defaultValues}

                    destroy={destroy}
                    shift_id={id}
                />
            )}

            {modalFilter && (
                <FormFilter
                    formValues={formFilter}
                    handleChangeFilter={handleChangeFilter}
                    handleClickFilter={handleClickFilter}
                    closeFilter={closeFilter}
                    users={props.users}
                />
            )}

            <div className="">
                <div className="tile">
                    <div className="col-md-12 text-right mb-3 pr-0">

                        {true && (
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
                                        <th style={{ width: "9%" }}>¿Registro forzado?</th>
                                        <th style={{ width: "10px" }}>Vista en el calendario</th>
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
                                                <td>{getDate(shift.start_date)}</td>
                                                <td>{getDate(shift.end_date)}</td>
                                                <td>{shift.user_responsible ? shift.user_responsible.names : ""}</td>
                                                <td>{shift.force_save ? "Si" : "No"}</td>
                                                <td>
                                                    <span className="badge label-preview" style={{ backgroundColor: shift.color }}>{shift.cost_center.code} - {shift.user_responsible.names}</span>
                                                </td>
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
