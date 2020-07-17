import React, { Component } from 'react';

class Index extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-md-12">
                        <div className="card card-table">
                            <div className="card-body">
                                <div className="col-md-12 p-0 mb-4">
                                    <div className="row">
                                        <div className="col-md-8 text-left">
                                            
                                        </div>

                                        <div className="col-md-4 text-right mt-1 mb-1">      
                                            <button
                                                className="btn btn-light mr-3"
                                                onClick={this.props.show}
                                            >
                                                Filtros <i className="fas fa-search ml-2"></i>
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default Index;