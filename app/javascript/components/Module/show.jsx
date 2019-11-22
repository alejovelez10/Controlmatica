import React from 'react';
import TableModuleActions from '../Module/TableModuleActions';

class show extends React.Component {

    constructor(props){
        super(props)

        this.state = {
            data: []
        }        
    
    }

    loadData = () => {
        fetch("/get_accion_modules/"  + this.props.modulo.id)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data
          });
        });
    }

    componentDidMount() {
        this.loadData();
    }

    render() {
        return (
            <React.Fragment>   
                <div className="tile">
                    <div className="col-md-12">

                        <div className="row">

                            <div className="col-md-11 text-center">
                                <h4>{this.props.modulo.name}</h4>
                            </div>

                            <div className="col-md-1">
                                <a href={`/module_controls`} className="btn btn-info">
                                    Volver
                                </a>
                            </div>

                        </div>
                        
                    </div>
                </div>


                <TableModuleActions dataActions={this.state.data} loadInfo={this.loadData} modulo={this.props.modulo} usuario={this.props.usuario} />
            </React.Fragment>
        );
    }
}

export default show;
