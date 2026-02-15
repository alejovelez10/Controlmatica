import React, { Component } from 'react';
import BarReporterHours from '../../generalcomponents/BarReporterHours';
import DonutDaysReport from '../../generalcomponents/DonutDaysReport';

class HourProjectMonth extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1
            }
        }
    }


    componentWillReceiveProps(nextProps) {
        this.loadData(new Date().getFullYear(), new Date().getMonth() + 1, nextProps.user);
    }



    componentDidMount() {
        this.loadData(new Date().getFullYear(), new Date().getMonth() + 1, this.props.user);
    }

    loadData = (year, month, user) => {

        fetch(`/home/get_dashboard_three_ing/${year}/${month}/${user}`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    data: data
                });
            });
    }

    handleChange = e => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });

    }

    filter = () => {
        this.loadData(this.state.form.year, this.state.form.month, this.props.user);
    }

    render() {
        return (
            <div className='row'>
                <div className='col-md-6'>
                    <div className='dashboard-filters'>
                        <select
                            name="year"
                            className="dashboard-select"
                            value={this.state.form.year}
                            onChange={this.handleChange}
                        >
                            <option value="">Seleccione año</option>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                        </select>
                        <select
                            name="month"
                            className="dashboard-select"
                            value={this.state.form.month}
                            onChange={this.handleChange}
                        >
                            <option value="">Seleccione mes</option>
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                        <button className='dashboard-btn-filter' onClick={() => this.filter()}>
                            <i className="fas fa-filter" style={{ marginRight: '6px' }}></i>
                            Filtrar
                        </button>
                    </div>
                    <div className="dashboard-card">
                        <BarReporterHours data={this.state.data} title={"Horas por Proyecto del Mes"} leyend={false} height={this.props.height} />
                    </div>
                </div>
                <div className='col-md-6'>
                    <div className="dashboard-card" style={{ marginTop: "76px" }}>
                        <DonutDaysReport data={this.state.data} title={"Distribución de Horas por Proyecto"} height={this.props.height} />
                    </div>
                </div>
            </div>
        )

    }
}

export default HourProjectMonth;
