import React, { Component } from 'react';
import {Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import NumberFormat from 'react-number-format';
import Select from "react-select";
import Dropzone from "react-dropzone";

class FormImportFile extends Component {

    constructor(props){
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            file: null,
            sizeFile: 0,
            nameFile: "",

            formAddFiles: {
                file: {},  
            },
        }
    }

    handleSubmit = e => {
        e.preventDefault();
    };

    handleFile = (archivo) => {
        archivo.map(file => (
            this.setState({
                formAddFiles: {
                    ...this.state.formAddFiles,
                    file: file
                },
  
                nameFile: file.path,
                sizeFile: file.size
            })
        ));
    };

    clearValuesFiles = () => {
        this.setState({
            formAddFiles: {
                ...this.state.formAddFiles,
                fileName: "",
                file: {},
            },

            isLoadedFiles: false,
            nameFile: "",
            file: null
        })
    }

    handleFileCreate = (archivo) => {
      archivo.map(file => (
          this.setState({
              formAddFiles: {
                  ...this.state.formAddFiles,
                  file: file.size >= 10000000 ? "" : file
              },

              nameFile: file.size >= 10000000 ? "El archivo supera el maximo permitido intenta con otro" : file.path,
              sizeFile: file.size
          })
      ));
    };



    HandleClickFiles = () => {
        this.setState({ isLoadedFiles: true })
        const formData = new FormData();
        formData.append("file", this.state.formAddFiles.file)

        fetch(`/upload_file/report_expenses`, {
            method: 'POST', // or 'PUT'
            body: formData, // data can be `string` or {object}!
            headers: {}
        })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {
            
            this.props.loadDataTable();
            this.props.closeModal();
            this.clearValuesFiles();
        });
    }


    render() {
        return (
            <React.Fragment>
                <Modal isOpen={this.props.modal} toggle={this.props.toggle} className="modal-dialog-centered" backdrop={this.props.backdrop}>
                    <ModalHeader className="title-modal" toggle={this.props.toggle}><i className="app-menu__icon fa fa-user mr-2"></i> {this.props.title}</ModalHeader>

                        <form onSubmit={this.handleSubmit}>
                            <ModalBody>
                                <div className="row">
                                    <div className={`col-md-12`}>
                                        <Dropzone onDrop={(files) => this.handleFileCreate(files)}>
                                            {({getRootProps, getInputProps}) => (
                                                <div
                                                    {...getRootProps({
                                                        className: 'dropzone',
                                                    })}
                                                >
                                                    <input {...getInputProps()} />
                                                    <p>{`${(this.state.nameFile != "" ? this.state.nameFile : "Arrastre y suelte el archivo aquí, o haga clic para seleccionar el archivo")}`}</p>
                                                </div>
                                            )}
                                        </Dropzone>

                                        
                                    </div>

                                    <div className="col-md-12 mt-3">
                                        <a
                                            className="dropdown-item"
                                            href={`https://gestionmejora.s3.amazonaws.com/uploads/survey_answer/answer_file/30336/control_de_gastos_plantilla.xls`}
                                            target="_blank"
                                        >
                                            <img src="https://mybc1.s3.amazonaws.com/uploads/rseguimiento/evidencia/244/file_formats_4_csv-512.png" alt="" style={{height: "35px"}}/> Descargar plantilla
                                        </a>
                                    </div>
                                </div>
                            </ModalBody>

                            <ModalFooter>
                                <label className="btn btn-light mt-2" onClick={() => this.props.toggle()}>Cerrar</label>
                                <button className="btn btn-secondary"
                                    onClick={this.HandleClickFiles}
                                    style={{ color: "#ffff" }}
                                >
                                    {this.props.nameBnt}
                                </button>
                            </ModalFooter>
                        </form>
                </Modal>
            </React.Fragment>
        );
    }
}

export default FormImportFile;

