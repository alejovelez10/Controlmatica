import React, { Component } from 'react';
import BarDayIng from '../../generalcomponents/BarDayIng';

class Commisions extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                value: new Date().getFullYear(),
            }
        }
    }



    componentWillReceiveProps(nextProps) {
        this.loadData(new Date().getFullYear(),nextProps.user);
    }

    componentDidMount() {
        this.loadData(new Date().getFullYear(), this.props.user);
    }



    loadData = (type, user) => {

        fetch(`/home/get_dashboard_five_ing/${type}/${user}`, {
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
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                        <option value="2019">2019</option>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>

                    </select>
                    {/* <button className='btn btn-primary' onClick={()=>this.loadData("6")}> 6 </button>
                        <button className='btn btn-primary' onClick={()=>this.loadData("3")}> 3 </button> */}
                </div>
                <hr />
                <BarDayIng data={this.state.data} title={"Aproximado comisiones acumuladas"} type="currency"/>
            </div>
        )

    }
}

export default Commisions;
