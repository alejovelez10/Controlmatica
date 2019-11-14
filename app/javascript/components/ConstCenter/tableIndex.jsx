import React from "react";
import SweetAlert from 'sweetalert2-react';
import Swal from 'sweetalert2/dist/sweetalert2.js'
import NumberFormat from 'react-number-format';


class tableIndex extends React.Component {
  constructor(props){
    super(props)

    this.state = {
        action: {},
        title: "Nuevo convenio",
    }

  }


  delete = (id) => {
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
        fetch("/sales_orders/" + id, {
          method: 'delete'
      }).then(response => response.json())
      .then(response => {
        this.props.loadInfo()
        
        Swal.fire(
          'Borrado!',
          '¡El registro fue eliminado con exito!',
          'success'
        )
      });
      }
    })

  }

  render() {
    return (
        <React.Fragment>

           <div className="col-md-12 p-0 mb-4">
                <div className="row">
                    <div className="col-md-8 text-left">
                        
                    </div>

                    <div className="col-md-4 text-right mt-1 mb-1">      
                          <a href="/cost_centers/new" className="btn btn-secondary">Nuevo centro de costo</a>
                    </div>

                </div>
            </div>

            <div className="content-table">
            
              <table
                className="table table-hover table-bordered table-width"
                id="sampleTable"
              >
                <thead>
                  <tr className="tr-title">
                    <th>Codigo</th>
                    <th>Cliente</th>
                    <th>Tipo de Servicio</th>
                    <th>Descripcion</th>
                    <th>Número de cotización</th>
                    <th>$ Ingeniería Cotizado</th>
                    <th>$ Ingeniería Ejecutado</th>
                    <th>$ Viaticos Cotizado</th>
                    <th>$ Viaticos Real</th>
                    <th>¿Finalizo?</th>
                    <th>Estado de ejecución</th>
                    <th>Estado facturado</th>
                    <th style={{width: "60px"}} className="text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {this.props.dataActions.length >= 1 ? (
                    this.props.dataActions.map(accion => (
                      <tr key={accion.id}>
                        <th>{accion.code}</th>
                        <th>{accion.customer.name}</th>
                        <th>{accion.service_type}</th>
                        <th>{accion.description}</th>
                        <th>{accion.quotation_number}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
                        <th>{accion.id}</th>
  
                        <td className="text-center" style={{ width: "10px"}}>   
                        <div
                            className="btn-group"
                            role="group"
                            aria-label="Button group with nested dropdown"
                          >
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-secondary"
                                id="btnGroupDrop1"
                                type="button"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                              >
                                <i className="fas fa-bars"></i>
                              </button>
                              <div className="dropdown-menu dropdown-menu-right">
                                <a href={`/cost_centers/${accion.id}`} target="_blank" className="dropdown-item">
                                  Gestionar
                                </a>    

                                <a href={`/cost_centers/${accion.id}/edit`} className="dropdown-item">
                                  Editar
                                </a>

                                <button onClick={() => this.delete(accion.id)} className="dropdown-item">
                                  Eliminar
                                </button>

                              </div>
                            </div>
                          </div>  
                        </td>
                      
                      </tr>
                    ))
                  ) : (
                    <td colSpan="8" className="text-center">
                        <div className="text-center mt-1 mb-1">
                        <h4>No hay registros</h4>
                          <a href="/cost_centers/new" className="btn btn-secondary">Nuevo centro de costo</a>
                        </div>
                    </td>
                  )}
                  
                </tbody>

              </table>
            </div>
          </React.Fragment>

    );
  }
}

export default tableIndex;
