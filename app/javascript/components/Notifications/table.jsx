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

    /////////////////////////////////////////////
    if (accion.editValues.name == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre el dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-5">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-5">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.email == true && accion.editValues.name == false  && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del email el dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-5">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-5">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.document_type == true && accion.editValues.name == false && accion.editValues.email == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del tipo de documento el dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.number_document == true && accion.editValues.document_type == false && accion.editValues.name == false && accion.editValues.email == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del numero de documento el dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == false && accion.editValues.document_type == false && accion.editValues.name == false && accion.editValues.email == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol el dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )
    
    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre y el email. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.number_document == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.number_document == false && accion.editValues.email == false && accion.editValues.document_type == true && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre y el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.number_document == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del email, el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.number_document == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.rol_id == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del email, el tipo de documento, el numero de documento y el rol. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.email == true && accion.editValues.number_document == true && accion.editValues.document_type == false && accion.editValues.name == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el email y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.name == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el email, el tipo de documento, el numero de documento y el nombre. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.number_document == true && accion.editValues.email == false && accion.editValues.document_type == true && accion.editValues.rol_id == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre, el numero de documento, el rol y el tipo de documento El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del email y el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.email == false && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.rol_id == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el tipo de documento y el nombre El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == true && accion.editValues.name == true && accion.editValues.document_type == false && accion.editValues.email == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el numero de documento y el nombre. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == false && accion.editValues.name == true && accion.editValues.document_type == true && accion.editValues.email == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el nombre, el email, el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.email == false && accion.editValues.document_type == true && accion.editValues.number_document == true && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del el tipo de documento y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == true && accion.editValues.email == true && accion.editValues.number_document == true && accion.editValues.document_type == false && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del nombre, el email y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.email == true && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.rol_id == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del email y el rol. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.name == false && accion.editValues.email == true && accion.editValues.document_type == false && accion.editValues.number_document == true && accion.editValues.rol_id == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del email y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.name == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol y el nombre. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == true && accion.editValues.email == false && accion.editValues.document_type == false && accion.editValues.name == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol y el numero de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el numero de documento tenia <b className="color-select">{accion.newValues.number_document[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.number_document[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )

    } else if (accion.editValues.rol_id == true && accion.editValues.number_document == false && accion.editValues.email == false && accion.editValues.document_type == true && accion.editValues.name == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol y el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )
    
    } else if (accion.editValues.rol_id == true && accion.editValues.email == true && accion.editValues.document_type == true && accion.editValues.number_document == false && accion.editValues.name == false) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el email y el tipo de documento. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el tipo de documento tenia <b className="color-select">{accion.newValues.document_type[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.document_type[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )
    
    } else if (accion.editValues.rol_id == true && accion.editValues.email == true && accion.editValues.document_type == false && accion.editValues.number_document == false && accion.editValues.name == true) {
      return(
        <React.Fragment>
          <b>{`Edicion del rol, el email y el nombre. El dia ${this.date(accion.date_update)}`}</b>
          <div className="col-md-10 mt-3">
              <div className="row">

                <div className="col-md-6">
                  <p className="text-center">Valores viejos</p>
                  <ul>
                    <li>el rol tenia <b className="color-select">{accion.newValues.rol_id[0]}</b></li>
                    <li>el email tenia <b className="color-select">{accion.newValues.email[0]}</b></li>
                    <li>el nombre tenia <b className="color-select">{accion.newValues.name[0]}</b></li>
                  </ul>
                </div>

                <div className="col-md-6">
                  <p className="text-center">Valores nuevos</p>
                  <ul>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.rol_id[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.email[1]}</b></li>
                    <li>fue cambiado por <b className="color-select">{accion.newValues.name[1]}</b></li>
                  </ul>
                </div>
                
              </div>
          </div>
        </React.Fragment>
      )
    /////////////////////////////////////////////


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
      

    handleClickUpdate = (id) => {
      fetch(`/update_state/${id}`)
      .then(response => response.json())
      .then(data => {
          this.props.loadInfo()
      });
    };
  


  render() {
    return (
      <React.Fragment>
        <ul className="nav nav-tabs mb-3" id="myTab" role="tablist">
          <li className="nav-item">
            <a className="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Pendientes de revision <span className="badge badge-warning">{this.props.dataPending.length}</span></a>
          </li>

          <li className="nav-item">
            <a className="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Revisadas <span className="badge badge-warning">{this.props.dataRevised.length}</span></a>
          </li>
        </ul>

        <div className="tab-content" id="myTabContent">
          <div className="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">
            {this.props.dataPending.length >= 1 ? (
                this.props.dataPending.map(accion => (
                  <div className={`card ${this.props.from != null ? (accion.id == this.props.from ? "select-item-back" : "") : ""}`} key={accion.id} style={{ marginBottom: "17px"}}>
                    <div className="card-body">
                        <div className="row">
                          
                          <div className="col-md-1">
                              <img src="https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg" className="img-info-show" alt=""/>
                          </div>

                          <div className="col-md-9">
                              {this.get_title(accion)}

                              <p>Esta infomacion fue editada por: <b>{accion.user.names}</b></p>
                          </div>

                          <div className="col-md-2 text-center">
                            <i onClick={() => this.handleClickUpdate(accion.id)} className={`fas fa-exclamation-triangle icon-notification ${this.props.from != null ? (accion.id == this.props.from ? "select-item" : "") : ""}`}></i>
                          </div>

                        </div>
                    </div>
                  </div>  
                ))
              ) : (
                <div className="card">
                    <div className="card-body">
                        <h5>No hay Notificaciones pendientes</h5>
                    </div>
                </div>
              )}
          </div>

          <div className="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab">
            {this.props.dataRevised.length >= 1 ? (
                this.props.dataRevised.map(accion => (
                  <div className="card" key={accion.id} style={{ marginBottom: "17px" }}>
                    <div className="card-body">
                        <div className="row">
                          
                          <div className="col-md-1">
                              <img src="https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg" className="img-info-show" alt=""/>
                          </div>

                          <div className="col-md-9">
                              {this.get_title(accion)}
                          </div>

                          <div className="col-md-2 text-center">
                            <i className="fas fa-check icon-notification"></i>
                          </div>

                        </div>
                    </div>
                  </div>  
                ))
              ) : (
                <div className="card">
                    <div className="card-body">
                        <h5>No hay Notificaciones pendientes</h5>
                    </div>
                </div>
              )}
          </div>

        </div>
      </React.Fragment>
    );
  }
}

export default table;
