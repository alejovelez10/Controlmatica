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
                month:  new Date().getMonth() + 1
            }
        }
    }


    componentWillReceiveProps(nextProps) {
        this.loadData(new Date().getFullYear(), new Date().getMonth() + 1,nextProps.user);
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

    filter = () =>{
        this.loadData(this.state.form.year, this.state.form.month );
    }

    render() {
        return (
            <div className='row'>
                <div className='col-md-6'>
                    <div className='p-1' style={{display:"flex", gap:"10px"}}>
                        <select
                            name="year"
                            className={`form form-control`}
                            value={this.state.form.year}
                            onChange={this.handleChange}
                            style={{ width: "200px" }}
                        >
                            <option value="">Seleccione año</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                            <option value="2019">2019</option>
                            <option value="2018">2018</option>
                            <option value="2017">2017</option>

                        </select>
                        <select
                            name="month"
                            className={`form form-control`}
                            value={this.state.form.month}
                            onChange={this.handleChange}
                            style={{ width: "200px" }}
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
                         <button className='btn btn-primary' onClick={()=>this.filter()}>Filtrar </button>
                    </div>
                    <hr />
                    <BarReporterHours data={this.state.data} title={"Horas por proyecto por mes"}/>
                </div>
                <div className='col-md-6' style={{marginTop: "45px"}}>
                <hr />
                    <DonutDaysReport data={this.state.data} title={"Horas por proyecto mes %"} />
                </div>

            </div>
        )

    }
}

export default HourProjectMonth;
