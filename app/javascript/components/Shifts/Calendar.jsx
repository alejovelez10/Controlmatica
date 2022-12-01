import React, { Component } from 'react';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import FormCreate from './FormCreate'
import interactionPlugin from "@fullcalendar/interaction"; // needed for dayClick
// import esLocale from '@fullcalendar/core/locales/es';
// must manually import the stylesheets for each plugin
// import "@fullcalendar/core/main.css";

import esLocale from '@fullcalendar/core/locales/es';

class Calendar extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: false,
            canDrop: true,
            calendarWeekends: true,
            modal: false,
            errorValues: true,
            arg: "",

            form: {
                start_date: "",
                end_date: "",
                cost_center_id: "",
                user_responsible_id: "",
            },

            selectedOptionCostCenter: {
                cost_center_id: "",
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_id: "",
                label: "Seleccione el usuario responsable"
            }
        }
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
                    array.push({ title: `${item.cost_center.code} ${item.user_responsible.names}`, start: new Date(item.start_date).setDate(new Date(item.start_date).getDate() + 1), id: item.id })
                ))

                this.setState({
                    data: array,
                    isLoaded: false
                })
            });
    }

    setCanDrop = () => { };
    calendarComponentRef = React.createRef();

    clearValues = () => {
        this.setState({
            form: {
                name: "",
                due_date: "",
                user_owner_id: "",
            },
        })
    }

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
        this.setState({
            selectedOptionCostCenter,
            form: {
                ...this.state.form,
                cost_center_id: selectedOptionCostCenter.value
            }
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
        if (true) {
            this.setState({
                modal: true,
                arg: arg,

                form: {
                    ...this.state.form,
                    start_date: arg.dateStr,
                },
            });
        }
    };

    updateDate = (task_id, date) => {
        fetch(`/task/update_date_calendar/${task_id}/${date}`, {
            method: 'PATCH', // or 'PUT'
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

    toogle = (from) => {
        if (from == "new") {
            this.setState({ modal: true })
        } else {
            this.setState({ modal: false })
            clearValues();
        }
    }

    validationForm = () => {
        if (this.state.form.end_date != "" &&
            this.state.form.start_date != "" &&
            this.state.form.cost_center_id != "" &&
            this.state.form.user_responsible_id != ""
        ) {
            this.setState({ errorValues: true })
            return true
        } else {
            this.setState({ errorValues: false })
            return false
        }
    }

    handleClick = () => {
        if (this.validationForm() == true) {
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
                    this.setState({ modal: false })
                    this.setState({
                        data: this.state.data.concat({
                            // creates a new array
                            id: data.register.id,
                            title: data.register.cost_center.code,
                            start: this.state.arg.date,
                        })
                    })
                });
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
                        title={this.state.modeEdit ? "Actualizar" : "Crear"}
                        nameBnt={this.state.modeEdit ? "Actualizar" : "Crear"}

                        //form props
                        formValues={this.state.form}
                        onChangeForm={this.handleChange}
                        submitForm={this.handleClick}
                        errorValues={this.state.errorValues}

                        selectedOptionCostCenter={this.state.selectedOptionCostCenter}
                        handleChangeAutocompleteCostCenter={this.handleChangeAutocompleteCostCenter}
                        cost_centers={this.props.cost_centers}

                        selectedOptionUser={this.state.selectedOptionUser}
                        handleChangeAutocompleteUser={this.handleChangeAutocompleteUser}
                        users={this.props.users}
                    />
                )}

                <div className="content main-card mb-3 card">
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
                            eventClick={(item) => this.handleClickShow(item.event._def.publicId)}
                            eventDrop={info => { this.eventDrop(info) }}
                        />
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default Calendar;
