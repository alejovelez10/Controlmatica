import React, { Component } from 'react';
import Select from "react-select";

class FormFilter extends Component {
    constructor(props){
        super(props)
        this.searchCostCenterTimeout = null;
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            costCenterOptions: [],
            costCenterLoading: false,
            selectedOptionCostCenter: {
                cost_center_ids: [],
                label: "Seleccione el centro de costo",
            },

            selectedOptionUser: {
                user_responsible_ids: [],
                label: "Seleccione el usuario responsable"
            }
        }
    }

    // Búsqueda de centros de costo con debounce
    handleCostCenterSearch = (inputValue) => {
        if (this.searchCostCenterTimeout) {
            clearTimeout(this.searchCostCenterTimeout);
        }

        if (inputValue.length < 2) {
            return;
        }

        this.setState({ costCenterLoading: true });

        this.searchCostCenterTimeout = setTimeout(() => {
            fetch(`/shifts/search_cost_centers?q=${encodeURIComponent(inputValue)}`, {
                method: 'GET',
                headers: {
                    "X-CSRF-Token": this.token,
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(data => {
                this.setState({
                    costCenterOptions: data,
                    costCenterLoading: false
                });
            })
            .catch(() => {
                this.setState({ costCenterLoading: false });
            });
        }, 300);
    }

    handleChangeAutocompleteCostCenter = selectedOptionCostCenter => {
        let array = []

        if(selectedOptionCostCenter){
            selectedOptionCostCenter.map((item) => (
                array.push(item.value)
            ))
        }

        this.props.handleChangeFilter({ target: { name: "cost_center_ids", value: selectedOptionCostCenter ? array : [] } } )
        this.setState({
            selectedOptionCostCenter: {
                cost_center_ids: array,
                label: "Seleccione el centro de costo",
            },
        });
    };


    handleChangeAutocompleteUser = (selectedOptionUser) => {
        let array = []

        if(selectedOptionUser){
            selectedOptionUser.map((item) => (
                array.push(item.value)
            ))
        }

        this.props.handleChangeFilter({ target: { name: "user_responsible_ids", value: selectedOptionUser ? array : [] } } )
        this.setState({
            selectedOptionUser: {
                user_responsible_ids: array,
                label: "Seleccione el usuario responsable"
            }
        });
    }

    render() {
        const filterStyles = {
            container: {
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                overflow: 'hidden'
            },
            header: {
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            },
            headerIcon: {
                background: '#f5a623',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
            },
            headerTitle: {
                fontSize: '16px',
                fontWeight: '600',
                color: '#2d3748',
                margin: 0
            },
            body: {
                padding: '20px'
            },
            label: {
                fontSize: '13px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px',
                display: 'block'
            },
            input: {
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none',
                background: '#fff'
            },
            footer: {
                padding: '16px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
            },
            btnApply: {
                background: '#f5a623',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
            },
            btnClose: {
                background: '#fff',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#4a5568',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
            }
        };

        const selectStyles = {
            control: (base, state) => ({
                ...base,
                borderRadius: '8px',
                borderColor: state.isFocused ? '#f5a623' : '#e2e8f0',
                boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 166, 35, 0.15)' : 'none',
                '&:hover': { borderColor: '#f5a623' },
                padding: '2px 0',
                fontSize: '14px'
            }),
            option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? '#f5a623' : state.isFocused ? '#fef9e7' : '#fff',
                color: state.isSelected ? '#fff' : '#2d3748',
                fontSize: '14px',
                padding: '10px 12px'
            }),
            multiValue: (base) => ({
                ...base,
                backgroundColor: '#fef9e7',
                borderRadius: '6px'
            }),
            multiValueLabel: (base) => ({
                ...base,
                color: '#e09000',
                fontWeight: '500'
            }),
            multiValueRemove: (base) => ({
                ...base,
                color: '#e09000',
                '&:hover': { backgroundColor: '#f5a623', color: '#fff' }
            })
        };

        return (
            <React.Fragment>
                <div style={filterStyles.container}>
                    <div style={filterStyles.header}>
                        <div style={filterStyles.headerIcon}>
                            <i className="fas fa-filter"></i>
                        </div>
                        <h4 style={filterStyles.headerTitle}>Filtros de búsqueda</h4>
                    </div>

                    <div style={filterStyles.body}>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <label style={filterStyles.label}>
                                    <i className="fas fa-calendar-alt" style={{ marginRight: '6px', color: '#f5a623' }}></i>
                                    Fecha inicial
                                </label>
                                <input
                                    type="datetime-local"
                                    name="start_date"
                                    value={this.props.formValues.start_date}
                                    onChange={this.props.handleChangeFilter}
                                    style={filterStyles.input}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <label style={filterStyles.label}>
                                    <i className="fas fa-calendar-check" style={{ marginRight: '6px', color: '#f5a623' }}></i>
                                    Fecha final
                                </label>
                                <input
                                    type="datetime-local"
                                    name="end_date"
                                    value={this.props.formValues.end_date}
                                    onChange={this.props.handleChangeFilter}
                                    style={filterStyles.input}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <input
                                    type="hidden"
                                    name="cost_center_ids"
                                    value={this.state.selectedOptionCostCenter.cost_center_ids}
                                />
                                <label style={filterStyles.label}>
                                    <i className="fas fa-building" style={{ marginRight: '6px', color: '#f5a623' }}></i>
                                    Centros de costo
                                    <small style={{ marginLeft: '6px', fontWeight: '400', color: '#9ca3af' }}>(escribe 2+ letras)</small>
                                </label>
                                <Select
                                    onChange={this.handleChangeAutocompleteCostCenter}
                                    options={this.state.costCenterOptions}
                                    onInputChange={this.handleCostCenterSearch}
                                    isLoading={this.state.costCenterLoading}
                                    isMulti
                                    closeMenuOnSelect={false}
                                    autoFocus={false}
                                    styles={selectStyles}
                                    placeholder="Buscar centros..."
                                    name="cost_center_ids"
                                    noOptionsMessage={() => "Escriba para buscar"}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <input
                                    type="hidden"
                                    name="user_responsible_ids"
                                    value={this.state.selectedOptionUser.user_responsible_ids}
                                />
                                <label style={filterStyles.label}>
                                    <i className="fas fa-users" style={{ marginRight: '6px', color: '#f5a623' }}></i>
                                    Usuarios responsables
                                </label>
                                <Select
                                    onChange={this.handleChangeAutocompleteUser}
                                    options={this.props.users}
                                    isMulti
                                    closeMenuOnSelect={false}
                                    autoFocus={false}
                                    styles={selectStyles}
                                    placeholder="Seleccione usuarios..."
                                    name="user_responsible_ids"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={filterStyles.footer}>
                        <button
                            onClick={() => this.props.closeFilter()}
                            style={filterStyles.btnClose}
                            onMouseOver={(e) => e.target.style.borderColor = '#cbd5e0'}
                            onMouseOut={(e) => e.target.style.borderColor = '#e2e8f0'}
                        >
                            <i className="fas fa-times"></i>
                            Cerrar
                        </button>
                        <button
                            onClick={() => this.props.handleClickFilter()}
                            style={filterStyles.btnApply}
                            onMouseOver={(e) => e.target.style.background = '#e09000'}
                            onMouseOut={(e) => e.target.style.background = '#f5a623'}
                        >
                            <i className="fas fa-search"></i>
                            Aplicar filtros
                        </button>
                    </div>
                </div>

            </React.Fragment>
        );
    }
}

export default FormFilter;
