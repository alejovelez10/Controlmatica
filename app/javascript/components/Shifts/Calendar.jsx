import React, { Component } from 'react';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import FormCreate from './FormCreate'
import interactionPlugin from "@fullcalendar/interaction"; // needed for dayClick
import FormFilter from './FormFilter';
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2";
import esLocale from '@fullcalendar/core/locales/es';
import { array } from 'prop-types';

class Calendar extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.searchCostCenterTimeout = null;
        this.state = {
            data: [],
            isLoaded: false,
            canDrop: true,
            modalFilter: false,
            calendarWeekends: true,
            modal: false,
            shift_id: "",
            errorValues: true,
            arg: "",
            str_label: "",
            errors_create: [],

            // Opciones de autocomplete para centros de costo
            costCenterOptions: [],
            costCenterLoading: false,

            form: {
                start_date: "",
                end_date: "",
                cost_center_id: "",
                user_responsible_id: "",
                description: "",
                subject: "",
                user_ids: [],
                force_save: false,
                color: "#1aa9fb"
            },

            formFilter: {
                end_date: "",
                start_date: "",
                cost_center_ids: [],
                user_responsible_ids: []
            },

            defaultValues: [],

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_id: "",
                label: "Seleccione el usuario responsable"
            },

            selectedOptionMulti: {
                user_ids: [],
                label: "Seleccione los usuarios"
            }
        }
    }

    // Búsqueda de centros de costo con debounce
    handleCostCenterSearch = (inputValue) => {
        if (this.searchCostCenterTimeout) {
            clearTimeout(this.searchCostCenterTimeout);
        }

        if (inputValue.length < 2) {
            this.setState({ costCenterOptions: [] });
            return;
        }

        this.setState({ costCenterLoading: true });

        this.searchCostCenterTimeout = setTimeout(() => {
            fetch(`/shifts/search_cost_centers?q=${encodeURIComponent(inputValue)}`, {
                method: 'GET',
                headers: {
                    "X-CSRF-Token": this.token,
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    costCenterOptions: data,
                    costCenterLoading: false
                });
            })
            .catch(() => {
                this.setState({ costCenterLoading: false });
            });
        }, 300);
    }

    clearValues = () => {
        this.setState({
            form: {
                start_date: "",
                end_date: "",
                cost_center_id: "",
                user_responsible_id: "",
                description: "",
                subject: "",
                user_ids: [],
                force_save: false,
                color: "#1aa9fb"
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_id: "",
                label: "Seleccione el usuario responsable"
            }
        })
    }

    componentDidMount = () => {
        // La carga inicial se hace en handleDatesSet cuando FullCalendar se monta
    }

    // Callback cuando cambia el rango visible del calendario
    handleDatesSet = (dateInfo) => {
        const startDate = dateInfo.startStr.split('T')[0];
        const endDate = dateInfo.endStr.split('T')[0];
        this.loadData(startDate, endDate);
    }

    loadData = (startDate = null, endDate = null) => {
        let url = this.props.url_calendar;

        // Agregar parámetros de fecha si están disponibles
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }

        fetch(url, {
            method: 'GET',
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                const array = []

                data.data.map((item) => (
                    array.push({
                        title: `${item.cost_center.code} - ${item.user_responsible ? item.user_responsible.names : "sin nombre"}`,
                        start: this.getDate(item.start_date),
                        end: this.getDate(item.end_date),
                        id: item.id,
                        backgroundColor: item.color
                    })
                ))

                this.setState({
                    data: array,
                    isLoaded: false
                })
            });
    }

    setCanDrop = () => { };
    calendarComponentRef = React.createRef();

    HandleChange = (e) => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value,
                name: e.target.name == "name" ? (e.target.value.length + 0 > 200 ? this.state.form.name : e.target.value) : this.state.form.name,
            }
        });
    }

    messageSuccess = (response) => {
        Swal.fire({
            position: "center",
            type: `${response.type}`,
            title: `${response.success}`,
            showConfirmButton: false,
            timer: 1500,
        });
    };

    destroy = (shift_id) => {
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
                fetch(`/shifts/${shift_id}`, {
                    method: "delete",
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                .then(response => response.json())
                .then(response => {
                    this.messageSuccess(response);
                    this.reloadCurrentView();
                    this.clearValues();
                    this.setState({ modal: false, modeEdit: false, shift_id: "", str_label: "" })
                });
            }
        })
    };

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.getDescriptionCostCenter(selectedOptionCostCenter.value)
        this.setState({
            selectedOptionCostCenter,
            str_label: `${selectedOptionCostCenter.label} - ${this.props.current_user_name}`
        });
    };


    handleChangeAutocompleteUser = (selectedOptionUser) => {
        this.setState({
            selectedOptionUser,
            form: {
                ...this.state.form,
                user_responsible_id: selectedOptionUser.value
            }
        });
    }

    toggleWeekends = () => {
        this.setState({
            // update a property
            calendarWeekends: !this.state.calendarWeekends
        });
    };

    gotoPast = () => {
        let calendarApi = this.calendarComponentRef.current.getApi();
        calendarApi.gotoDate("2000-01-01"); // call a method on the Calendar object
    };

    getDateOpenModal = (register_date, hours) => {
        let date = new Date(register_date)
        let date_month = ("0" + (date.getMonth() + 1)).slice(-2)
        let day = ("0" + (date.getDate() + 1)).slice(-2)
        let new_date = `${date.getFullYear()}-${date_month}-${day}T${hours}`
        return new_date
    }

    handleDateClick = arg => {
        const start_date = `${arg.dateStr}`
        const end_date = `${arg.dateStr}`

        if (true) {
            this.setState({
                modal: true,
                shift_id: "",
                errors_create: [],
                arg: arg,

                form: {
                    ...this.state.form,
                    start_date: this.getDateOpenModal(start_date, "08:00"),
                    end_date: this.getDateOpenModal(end_date, "17:00"),
                },
            });
        }
    };

    digits_count = (n) => {
        var count = 0;
        if (n >= 1) ++count;

        while (n / 10 >= 1) {
            n /= 10;
            ++count;
        }

        return count;
    }

    getDate = (register_date) => {
        let date = new Date(register_date)
        let mins = ('0' + date.getMinutes()).slice(-2);
        let date_month = ("0" + (date.getMonth() + 1)).slice(-2)
        let day = ("0" + (date.getDate())).slice(-2)
        let hours = ('0'+date.getUTCHours()).slice(-2);
        let new_date = `${date.getFullYear()}-${date_month}-${day}T${hours}:${mins}`
        return new_date
    }

    getDescriptionCostCenter = (cost_center_id) => {
        fetch(`/get_cost_center_description/${cost_center_id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    form: {
                        ...this.state.form,
                        subject: data.register.description,
                        cost_center_id: data.register.id,
                    },
                });
            });
    }


    updateDate = (shift_id, date) => {
        const form = {
            start_date: date
        }

        fetch(`/shifts/${shift_id}`, {
            method: 'PATCH', // or 'PUT'
            body: JSON.stringify(form), // data can be `string` or {object}!
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })

            .then(res => res.json())
            .catch(error => console.error("Error:", error))
            .then(data => {

            });
    }

    handleClickCreate = () => {

    };


    eventDrop = (info) => {
        const task_id = info.event._def.publicId
        const { start, end } = info.oldEvent._instance.range;
        const { start: newStart, end: newEnd } = info.event._instance.range;
        const date = this.getDate(newStart)
        this.updateDate(task_id, date)

        if (new Date(start).getDate() === new Date(newStart).getDate()) {
            info.revert();
        }
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modalShow: true })
        } else {
            this.setState({ modalShow: false, task: {} })
        }
    }

    toogleNew = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
        }
    }

    validationForm = () => {
        if (this.state.form.name != "" &&
            this.state.form.due_date != "" &&
            this.state.form.user_owner_id != ""
        ) {
            this.setState({ ErrorValues: true })
            return true
        } else {
            this.setState({ ErrorValues: false })
            return false
        }
    }

    updateDataFilter = (data) => {
        const array = []

        data.data.map((item) => (
            array.push({ title: `${item.name}`, start: new Date(item.due_date), id: item.id })
        ))

        this.setState({
            data: array,
            isLoaded: false
        })
    }

    updateStateIsLoaded = (state) => {
        this.setState({
            isLoaded: state,
        })
    }

    cancelFilter = () => {
        this.reloadCurrentView()
        this.setState({
            isFiltering: false,
            isLoaded: false,
            showFilter: false,
        })
    }

    handleClickShowFilter = () => {
        this.setState({
            showFilter: !this.state.showFilter
        })
    }

    handleClickShow = (shift_id, event) => {
        fetch(`/get_shift_info/${shift_id}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                const arrayIds = [];

                data.register.users.map((user) => (
                    arrayIds.push(user.value)
                ))

                this.setState({
                    modal: true,
                    shift_id: shift_id,
                    defaultValues: data.register.users,
                    str_label: `${data.register.cost_center.code} - ${this.props.current_user_name}`,

                    form: {
                        start_date: this.getDate(data.register.start_date),
                        end_date: this.getDate(data.register.end_date),
                        cost_center_id: data.register.cost_center.id,
                        user_responsible_id: (data.register.user_responsible ? data.register.user_responsible.id : ""),
                        description: data.register.description,
                        subject: data.register.subject,
                        force_save: data.register.force_save,
                        color: data.register.color,
                        user_ids: arrayIds
                    },
                    

                    selectedOptionCostCenter: {
                        cost_center_id: data.register.cost_center.id,
                        label: data.register.cost_center.code,
                    },

                    selectedOptionUser: {
                        user_responsible_id: (data.register.user_responsible ? data.register.user_responsible.id : ""),
                        label: (data.register.user_responsible ? data.register.user_responsible.names : ""),
                    },
                })
            });
    }

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
            this.clearValues();
        }
    }

    validationForm = () => {
        if (this.state.form.end_date != "" &&
            this.state.form.start_date != "" &&
            this.state.form.cost_center_id != ""
        ) {
            this.setState({ errorValues: true })
            return true
        } else {
            this.setState({ errorValues: false })
            return false
        }
    }

    updateItem = (shift) => {
        this.setState({
            data: this.state.data.map(item => {
                if (shift.id === item.id) {
                    return {
                        ...item,
                        start: shift.start_date,
                        end: shift.end_date,
                        title: shift.cost_center.code,
                    }
                }
                return item;
            })
        });
    }

    handleClick = () => {
        if (this.validationForm()) {
            if (this.state.shift_id) {
                fetch(`/shifts/${this.state.shift_id}`, {
                    method: 'PATCH', // or 'PUT'
                    body: JSON.stringify(this.state.form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        this.reloadCurrentView();
                        this.clearValues();
                        this.setState({
                            modal: false,
                            shift_id: "",
                        })
                    });
            } else {
                fetch(`/shifts`, {
                    method: 'POST', // or 'PUT'
                    body: JSON.stringify(this.state.form), // data can be `string` or {object}!
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })

                    .then(res => res.json())
                    .catch(error => console.error("Error:", error))
                    .then(data => {
                        console.log(data)
                       
                        if (!data.force_save) {
                            this.setState({
                                errors_create: data.errors, 
                            })
                        }else{
                            this.setState({
                                modal: false,
                                shift_id: "",  
                                errors_create: [],
                            })
                            this.clearValues();
                            this.reloadCurrentView();
                        }
                    });
            }
        }
    }

    handleChange = (e) => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        })
    }

    handleChangeAutocompleteMulti = selectedOptionMulti => {
        let array = []

        if (selectedOptionMulti) {
            selectedOptionMulti.map((item) => (
                array.push(item.value)
            ))
        }

        this.setState({
            form: {
                ...this.state.form,
                user_ids: selectedOptionMulti ? array : [],
            }
        })
    }

    handleClickFilter = () => {
        fetch(`${this.props.url_calendar}?start_date=${this.state.formFilter.start_date}&end_date=${this.state.formFilter.end_date}&cost_center_ids=${this.state.formFilter.cost_center_ids}&user_responsible_ids=${this.state.formFilter.user_responsible_ids}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                const array = []

                //array.push({ title: `${item.cost_center.code} - ${item.user_responsible ? item.user_responsible.names : "sin nombre"}`, start: new Date(item.start_date).setDate(new Date(item.start_date).getDate()), end: new Date(item.end_date).setDate(new Date(item.end_date).getDate()), id: item.id })
                data.data.map((item) => (
                    array.push({ title: `${item.cost_center.code} - ${item.user_responsible ? item.user_responsible.names : "sin nombre"}`, start: this.getDate(item.start_date), end: this.getDate(item.end_date), id: item.id, backgroundColor: item.color })
                ))

                this.setState({
                    data: array,
                    isLoaded: false
                })
            });
    }

    handleChangeFilter = (e) => {
        this.setState({
            formFilter: {
                ...this.state.formFilter,
                [e.target.name]: e.target.value,
            }
        });
    }

    clearValuesFilter = () => {
        this.setState({
            formFilter: {
                end_date: "",
                start_date: "",
                cost_center_ids: [],
                user_responsible_ids: []
            },
        })
    }

    toogleFilter = (from) => {
        if (from == "new") {
            this.setState({ modalFilter: true })
        } else {
            this.setState({ modalFilter: false })
            this.clearValuesFilter();
        }
    }

    closeFilter = () => {
        this.setState({ modalFilter: false })
        this.clearValuesFilter();
        // Recargar con el rango actual del calendario
        this.reloadCurrentView();
    }

    reloadCurrentView = () => {
        if (this.calendarComponentRef.current) {
            const calendarApi = this.calendarComponentRef.current.getApi();
            const view = calendarApi.view;
            const startDate = view.activeStart.toISOString().split('T')[0];
            const endDate = view.activeEnd.toISOString().split('T')[0];
            this.loadData(startDate, endDate);
        } else {
            this.loadData();
        }
    }

    renderEventContent(eventInfo) {
        const eventStyle = {
            backgroundColor: eventInfo.event.backgroundColor || '#f5a623',
            width: "100%",
            padding: "6px 10px",
            borderRadius: "6px",
            textAlign: "left",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "500",
            lineHeight: "1.3",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
        };

        return (
            <div style={eventStyle} title={eventInfo.event.title}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fas fa-circle" style={{ fontSize: '6px', opacity: 0.7 }}></i>
                    {eventInfo.event.title}
                </span>
            </div>
        )
    }


    render() {
        const calendarStyles = `
            /* Contenedor principal del calendario */
            .fc {
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            /* Toolbar header */
            .fc .fc-toolbar.fc-header-toolbar {
                margin-bottom: 1.5em;
                padding: 0 4px;
            }

            .fc .fc-toolbar-title {
                font-size: 1.4em;
                font-weight: 600;
                color: #2d3748;
            }

            /* Botones del calendario - naranja Controlmatica */
            .fc .fc-button {
                background: #f5a623;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                text-transform: capitalize;
                transition: all 0.2s ease;
            }

            .fc .fc-button:hover {
                background: #e09000;
            }

            .fc .fc-button:focus {
                box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.3);
            }

            .fc .fc-button-primary:disabled {
                background: #cbd5e0;
            }

            /* Botón activo - mismo estilo que los otros */
            .fc .fc-button-primary:not(:disabled).fc-button-active,
            .fc .fc-button-primary:not(:disabled):active {
                background: #f5a623 !important;
            }

            /* Grupo de botones */
            .fc .fc-button-group {
                gap: 4px;
            }

            .fc .fc-button-group > .fc-button {
                border-radius: 8px !important;
                margin-left: 4px;
                background: #f5a623 !important;
            }

            .fc .fc-button-group > .fc-button:first-child {
                margin-left: 0;
            }

            .fc .fc-button-group > .fc-button:hover {
                background: #e09000 !important;
            }

            /* Botones de navegación (prev, next) */
            .fc .fc-prev-button,
            .fc .fc-next-button {
                padding: 8px 12px;
            }

            .fc .fc-prev-button .fc-icon,
            .fc .fc-next-button .fc-icon {
                font-size: 1.2em;
            }

            /* Botón Today */
            .fc .fc-today-button {
                background: #fff;
                color: #f5a623;
                border: 2px solid #f5a623;
                box-shadow: none;
            }

            .fc .fc-today-button:hover:not(:disabled) {
                background: #f5a623;
                color: #fff;
            }

            .fc .fc-today-button:disabled {
                background: #f7fafc;
                color: #a0aec0;
                border-color: #e2e8f0;
            }

            /* Grid del calendario */
            .fc .fc-scrollgrid {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }

            .fc .fc-scrollgrid td,
            .fc .fc-scrollgrid th {
                border-color: #e2e8f0;
            }

            /* Encabezado días de la semana */
            .fc .fc-col-header-cell {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                padding: 12px 0;
            }

            .fc .fc-col-header-cell-cushion {
                color: #4a5568;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Celdas de días */
            .fc .fc-daygrid-day {
                transition: background 0.2s ease;
            }

            .fc .fc-daygrid-day:hover {
                background: #f8fafc;
            }

            .fc .fc-daygrid-day-number {
                color: #4a5568;
                font-weight: 500;
                padding: 8px 10px;
            }

            /* Día de hoy */
            .fc .fc-day-today {
                background: rgba(245, 166, 35, 0.08) !important;
            }

            .fc .fc-day-today .fc-daygrid-day-number {
                background: #f5a623;
                color: #fff;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 4px;
            }

            /* Time grid */
            .fc .fc-timegrid-slot {
                height: 48px;
            }

            .fc .fc-timegrid-slot-label-cushion {
                color: #718096;
                font-size: 12px;
                font-weight: 500;
            }

            /* Eventos */
            .fc-event {
                border-radius: 6px;
                border: none;
                padding: 4px 8px;
                font-size: 12px;
                font-weight: 500;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .fc-event:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }

            .fc-event-title {
                font-weight: 500;
            }

            /* Popover */
            .fc .fc-popover {
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }

            .fc .fc-popover-header {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px 12px 0 0;
                padding: 10px 12px;
            }

            /* Card container moderno */
            .calendar-modern-card {
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                border: 1px solid #e2e8f0;
            }

            .calendar-modern-header {
                padding: 16px 20px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .calendar-modern-body {
                padding: 20px;
            }

            /* Botón de filtros - gris claro */
            .btn-filter-modern {
                background: #adb5bd;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 500;
                color: #fff;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .btn-filter-modern:hover {
                background: #6c757d;
            }

            .btn-filter-modern i {
                font-size: 14px;
            }
        `;

        if (this.state.isLoaded) {
            return (
                <div className="card">
                    <div className="card-body">
                        <p>Cargando informacion..</p>
                    </div>
                </div>
            )
        }

        return (
            <React.Fragment>
                <style>{calendarStyles}</style>
                {this.state.modal && (
                    <FormCreate
                        errors={this.state.errors_create}
                        backdrop={"static"}
                        modal={this.state.modal}
                        toggle={this.toogle}
                        title={this.state.shift_id ? "Actualizar turno" : "Crear turno"}
                        nameBnt={this.state.shift_id ? "Actualizar" : "Crear"}
                        modeEdit={this.state.shift_id ? true : false}

                        //form props
                        formValues={this.state.form}
                        onChangeForm={this.handleChange}
                        submitForm={this.handleClick}
                        errorValues={this.state.errorValues}
                        microsoft_auth={this.props.microsoft_auth}
                        str_label={this.state.str_label}

                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        cost_centers={this.state.costCenterOptions}
                        onCostCenterSearch={this.handleCostCenterSearch}
                        costCenterLoading={this.state.costCenterLoading}

                        selectedOptionUser={this.state.selectedOptionUser}
                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        users={this.props.users}

                        handleChangeAutocompleteMulti={this.handleChangeAutocompleteMulti}
                        selectedOptionMulti={this.state.selectedOptionMulti}
                        defaultValues={this.state.defaultValues}

                        destroy={this.destroy}
                        shift_id={this.state.shift_id}
                    />
                )}

                {this.state.modalFilter && (
                    <FormFilter
                        formValues={this.state.formFilter}
                        handleChangeFilter={this.handleChangeFilter}
                        handleClickFilter={this.handleClickFilter}
                        closeFilter={this.closeFilter}
                        users={this.props.users}
                    />
                )}


                <div className="calendar-modern-card">

                    {!this.state.modalFilter && (
                        <div className="calendar-modern-header">
                            <button
                                className="btn-filter-modern"
                                onClick={() => this.toogleFilter("new")}
                            >
                                <i className="fas fa-filter"></i>
                                Filtros
                            </button>
                        </div>
                    )}

                    <div className="calendar-modern-body">

                        <FullCalendar
                            editable={true}
                            defaultView="timeGridWeek"
                            locale={esLocale}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            ref={this.calendarComponentRef}
                            weekends={this.state.calendarWeekends}
                            events={this.state.data}
                            dateClick={this.handleDateClick}
                            datesSet={this.handleDatesSet}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}

                            eventContent={this.renderEventContent}
                            eventColor={'#3f69d7'}
                            eventClick={(item) => this.handleClickShow(item.event._def.publicId, item.event)}
                            eventDrop={info => { this.eventDrop(info) }}
                        />
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default Calendar;
