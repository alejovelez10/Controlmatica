import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      action: {},
    }
  }

  date = (fecha) => {
    var d = new Date(fecha),
    months = ['Enero','Febrero','Marzo','Abril','Mayo','junio','julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " +d.getFullYear()
  }

  get_title = (accion) =>{
   
    if (accion.editValues.name == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre el dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.email == true && accion.editValues.name == false  && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del email el dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.document_type == true && accion.editValues.name == false && accion.editValues.email == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del tipo de documento el dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.number_document == true && accion.editValues.document_type == true && accion.editValues.name == false && accion.editValues.email == false && accion.editValues.rol_id == false) {
      return `Edicion del numero de documento el dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == true && accion.editValues.document_type == true && accion.editValues.name == false && accion.editValues.email == false) {
      return `Edicion del rol el dia ${this.date(accion.date_update)}`

    // nombre convinacio

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.number_document == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.number_document == true && accion.editValues.document_type == false && accion.editValues.rol_id == false) {
      return `Edicion del nombre, el email y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == true) {
      return `Edicion del nombre, el email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`

    // email convinaciones

    } else if (accion.editValues.name == true && accion.editValues.email == true) {
      return `Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true) {
      return `Edicion del nombre, el email, el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == true) {
      return `Edicion del nombre, el email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`

    // Tipo de documento convinaciones

    } else if (accion.editValues.name == true && accion.editValues.email == true) {
      return `Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true) {
      return `Edicion del nombre, el email, el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == true) {
      return `Edicion del nombre, el email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`

    // Numero de documento convinaciones

    } else if (accion.editValues.name == true && accion.editValues.email == true) {
      return `Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true) {
      return `Edicion del nombre, el email, el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == true) {
      return `Edicion del nombre, el email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`

    // Rol convinaciones

    } else if (accion.editValues.name == true && accion.editValues.email == true) {
      return `Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true) {
      return `Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true) {
      return `Edicion del nombre, el email, el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == true) {
      return `Edicion del nombre, el email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`

     

    } else {
      return "Edicion "
    } 
  }

  MessageSucces = (name_success, type, error_message) => {
        Swal.fire({
        position: "center",
        type: type,
        html: '<p>'  + error_message !=  undefined ? error_message : "asdasdasd"  +  '</p>',
        title: name_success,
        showConfirmButton: false,
        timer: 1500 
        });
    }


  delete = id => {
    Swal.fire({
      title: "Estas seguro?",
      text: "El registro sera eliminado para siempre!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {
        fetch("/providers/" + id, {
          method: "delete"
        })
          .then(response => response.json())
          .then(response => {
            this.props.loadInfo();

            Swal.fire(
              "Borrado!",
              "¡El registro fue eliminado con exito!",
              "success"
            );
          });
      }
    });
  };



  render() {
    return (
      <React.Fragment>
        <div className="content">
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <div className="card" key={accion.id} style={{ marginBottom: "17px" }}>
                  <div className="card-body">
                      <div className="row">
                        
                        <div className="col-md-1">
                            <img src="https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg" className="img-info-show" alt=""/>
                        </div>

                        <div className="col-md-10">
                            <h5>{this.get_title(accion)} </h5>
                        </div>

                      </div>
                  </div>
                </div>  
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                      {this.props.estados.create == true && (
                        <a href="/providers/new" className="btn btn-secondary" >Nuevo Proveedor</a>
                      )}
                  </div>
                </td>
              </tr>
            )}
        </div>
      </React.Fragment>
    );
  }
}

export default table;
