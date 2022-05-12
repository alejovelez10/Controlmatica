import React, { Component } from 'react';
import BarReporterHours from '../../generalcomponents/BarReporterHours';

class HourDay extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                value: 10
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        this.loadData(10,nextProps.user);
    }

    componentDidMount() {
        this.loadData(10, this.props.user);
    }

    loadData = (type, user) => {

        fetch(`/home/get_dashboard_four_ing/${type}/${user}`, {
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
        this.loadData(e.target.value,this.props.user);
    }


    render() {
        return (
            <div >
                <div className='p-1'>
                    <select
                        name="value"
                        className={`form form-control`}
                        value={this.state.form.value}
                        onChange={this.handleChange}
                        style={{ width: "200px" }}
                    >
                        <option value="">Seleccione año</option>
                        <option value="10">Ultimos 10 días</option>
                        <option value="15">Ultimos 15 días</option>
                        <option value="30">Ultimos 30 días</option>

                    </select>
                    {/* <button className='btn btn-primary' onClick={()=>this.loadData("6")}> 6 </button>
                        <button className='btn btn-primary' onClick={()=>this.loadData("3")}> 3 </button> */}
                </div>
                <hr />
                <BarReporterHours data={this.state.data} title={"ESTAS SON TUS HORAS POR PROYECTO DÍA"} leyend={true}  height={this.props.height}/>
            </div>
        )

    }
}

export default HourDay;
