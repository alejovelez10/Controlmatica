import React from 'react';
import Table from "../Providers/table";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";

class index extends React.Component {
    constructor(props){
        super(props)

        this.state = {
            data: [],
            formSearch: {
              name: "",
            },

            stateSearch: false,
            stateSearchCancel: false,
            submitBtnFile: false,

            file: null,
        }
    }

    loadData = () => {
        fetch("/get_providers")
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

    handleChange = e => {
      this.setState({
        formSearch: {
          ...this.state.formSearch,
          [e.target.name]: e.target.value
        }
      });
    };

    HandleClickFilter = e => {
      fetch(`/get_providers?name=${this.state.formSearch.name != undefined ? this.state.formSearch.name : "" }`)
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data,
            stateSearchCancel: true
          });
        });
    };


    CancelFilter = () =>{
      this.setState({
        formSearch: {
          name: "",
        },
        stateSearchCancel: false
      });
      this.loadData();
    }


    messageSuccess = (response) => {
      Swal.fire({
        position: "center",
        type: "success",
        title: `${response.success}`,
        showConfirmButton: false,
        timer: 1500,
      });
    };

    uploadExel = (e) => {
      this.setState({
          file: e.target.files[0],
          submitBtnFile: (this.state.submitBtnFile == false ? true : false)
      });
    }

    handleClickUpload = () => {
      const formData = new FormData();
      formData.append("file", this.state.file)
      fetch(`/import_providers`, {
          method: 'POST', // or 'PUT'
          body: formData, // data can be `string` or {object}!
          headers: {}
      })
      .then(res => res.json())
      .catch(error => console.error("Error:", error))
      .then(data => {
          this.loadData();
          this.setState({ submitBtnFile: false })
          this.messageSuccess(data)
          setTimeout(() => {
            location.reload();
          }, 1000);
      });
    }


    render() {      
        return (
            <React.Fragment>
             <div className="row">
                <div className="col-md-12">
                  <div className="card card-table">
                    <div className="card-body">

                    <div className="row mb-4">
                        <div className="col-md-12">
                            <div className="row">

                                <div className="col-md-6">
                                   <div className="col-md-5 pl-0">

                                   <div className="input-group">
                                      <input type="text" name="name" style={{ height: "37px" }} className="form-control" onChange={this.handleChange} value={this.state.formSearch.name} placeholder="Buscador" />

                                      <div className="input-group-append">
                                      
                                          <button className="btn btn-secondary" onClick={this.HandleClickFilter}>
                                            <i className="fas fa-search"></i>
                                          </button>
                                      

                                        {this.state.stateSearchCancel == true && (
                                          <button className="btn btn-danger" onClick={this.CancelFilter} type="button">Cancel</button>
                                        )}

                                      </div>

                                    </div>

                                   </div>
                                </div>

                                <div className="col-md-5">
                                    <div className="row text-right">
                                        {this.props.estados.download_file == true && (
                                          <a
                                            className=" mr-2"
                                            href={`/download_file/providers.xls`}
                                            target="_blank"
                                          >
                                            <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/>
                                          </a>
                                        )}

                                      <div className="dropdown mr-3">
                                        <button className="btn btn-info dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                          Subida de Archivo
                                        </button>
                                        <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                          <a className="dropdown-item" href="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/701/FORMATO_SUBIR_PROVEEDORES.xlsx">Descargar formato</a>
                                          <label className="dropdown-item" htmlFor="fathers" >Cargar archivo</label>
                                        </div>
                                      </div>

                                        <input
                                            type="file"
                                            id="fathers"
                                            onChange={(e) => this.uploadExel(e)}
                                            style={{ display: "none" }}
                                        />

                                        {this.state.submitBtnFile && (
                                            <button
                                                onClick={() => this.handleClickUpload()}
                                                className="btn-shadow btn btn-primary mr-3"
                                            >
                                                Subir <i className="fas fa-file-upload"></i>
                                            </button>
                                        )}

                                        {this.props.estados.create == true && (
                                            <a href="/providers/new" className="btn btn-secondary" >Nuevo Proveedor</a>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                      
      
                      <Table 
                        dataActions={this.state.data} 
                        loadInfo={this.loadData}
                        usuario={this.props.usuario}
                        estados={this.props.estados}
                      />
                    
      
                    </div>
                  </div>
                </div>
              </div>

            </React.Fragment>

        )
      
    }
}

export default index;


/*asdasdasd*/ 