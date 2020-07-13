import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import Index from '../components/Informes/Index'

class InformesIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            isLoaded: true,
            dataCostCenter: [],
            dataMaterials: [],
            dataTableristas: [],
        }
    }

    componentDidMount(){
        this.loadData();
    }

    updateStateLoad = (state) => {
        this.setState({ isLoaded: state })
    } 

    loadData = () => {
        fetch(`/get_informes`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
          this.setState({
            dataCostCenter: data.dataCostCenter,
            dataMaterials: data.dataMaterials,
            dataTableristas: data.dataTableristas,
            isLoaded: false
          });
        });
    }

    render() {
        return (
            <React.Fragment>
                <Index
                    updateStateLoad={this.updateStateLoad}
                    loadData={this.loadData}
                    estados={this.props.estados}
                    isLoaded={this.state.isLoaded}

                    dataCostCenter={this.state.dataCostCenter}
                    dataMaterials={this.state.dataMaterials}
                    dataTableristas={this.state.dataTableristas}
                />
            </React.Fragment>
        );
    }
}


export default InformesIndex;
WebpackerReact.setup({ InformesIndex });