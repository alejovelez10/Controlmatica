import React, { Component } from 'react';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import FormCreate from './FormCreate'
import interactionPlugin from "@fullcalendar/interaction"; // needed for dayClick
import FormFilter from './FormFilter';
// import esLocale from '@fullcalendar/core/locales/es';
// must manually import the stylesheets for each plugin
// import "@fullcalendar/core/main.css";

import esLocale from '@fullcalendar/core/locales/es';
import { array } from 'prop-types';

class Calendar extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
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

            form: {
                start_date: "",
                end_date: "",
                cost_center_id: "",
                user_responsible_id: "",
                description: "",
                subject: "",
                user_ids: [],
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
        this.loadData();
    }

    loadData = () => {
        fetch(this.props.url_calendar, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                const array = []

                data.data.map((item) => (
                    array.push({ title: `${item.cost_center.code} - ${item.user_responsible ? item.user_responsible.names : "sin nombre"}`, start: new Date(item.start_date).setDate(new Date(item.start_date).getDate()), end: new Date(item.end_date).setDate(new Date(item.end_date).getDate()), id: item.id })
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


    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        this.getDescriptionCostCenter(selectedOptionCostCenter.value)
        this.setState({
            selectedOptionCostCenter,
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

    handleDateClick = arg => {
        const date = new Date()
        const start_date = `${arg.dateStr}T08:00`
        const end_date = `${arg.dateStr}T17:00`
        
        if (true) {
            this.setState({
                modal: true,
                arg: arg,

                form: {
                    ...this.state.form,
                    start_date: start_date,
                    end_date: end_date,
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
        let date_month = this.digits_count(date.getUTCDate()) == 1 ? `0${date.getUTCDate()}` : `${date.getUTCDate()}`
        let new_date = `${date.getFullYear()}-${date.getUTCMonth() + 1}-${date_month}T${date.getHours()}:${date.getMinutes()}`
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
        const date = `${newStart.getFullYear()}-${newStart.getMonth() + 1}-${newStart.getDate() + 1}`
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
        this.loadData()
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

                form: {
                    start_date: this.getDate(data.register.start_date),
                    end_date: this.getDate(data.register.end_date),
                    cost_center_id: data.register.cost_center.id,
                    user_responsible_id: (data.register.user_responsible ? data.register.user_responsible.id : ""),
                    description: data.register.description,
                    subject: data.register.subject,
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
                        start: new Date(shift.start_date).setDate(new Date(shift.start_date).getDate()),
                        end: new Date(shift.end_date).setDate(new Date(shift.end_date).getDate()),
                        title: shift.cost_center.code,
                    }
                }
                return item;
            })
        });
    }

    handleClick = () => {
        if (this.validationForm()) {
            if(this.state.shift_id){
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
                    this.updateItem(data.register);
                    this.clearValues();
                    this.setState({
                        modal: false, 
                        shift_id: "",
                    })
                });
            }else{
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
                    this.clearValues();
                    this.loadData();
                    this.setState({
                        modal: false, 
                        shift_id: "",
                    })
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

        if(selectedOptionMulti){
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
            this.setState({ data: data.data })
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
        this.loadData();
    }

    
    render() {
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
                {this.state.modal && (
                    <FormCreate
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

                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        cost_centers={this.props.cost_centers}

                        selectedOptionUser={this.state.selectedOptionUser}
                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        users={this.props.users}

                        handleChangeAutocompleteMulti={this.handleChangeAutocompleteMulti}
                        selectedOptionMulti={this.state.selectedOptionMulti}
                        defaultValues={this.state.defaultValues}
                    />
                )}

                {this.state.modalFilter && (
                    <FormFilter
                        formValues={this.state.formFilter}
                        handleChangeFilter={this.handleChangeFilter}
                        handleClickFilter={this.handleClickFilter}
                        closeFilter={this.closeFilter}
                        users={this.props.users}
                        cost_centers={this.props.cost_centers}
                    />
                )}


                <div className="content main-card mb-3 card">

                    {!this.state.modalFilter && (
                        <div className="card-header">
                            {true && (
                                <button 
                                    className="btn btn-primary ml-3"
                                    onClick={() => this.toogleFilter("new")}
                                >
                                    Filtros
                                </button> 
                            )}  
                        </div>
                    )}

                    <div className="card-body">

                        <FullCalendar
                            editable={true}
                            defaultView="timeGridWeek"
                            locale={esLocale}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            ref={this.calendarComponentRef}
                            weekends={this.state.calendarWeekends}
                            events={this.state.data}
                            dateClick={this.handleDateClick}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}


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
