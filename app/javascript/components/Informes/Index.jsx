import React, { Component } from 'react';
import LineChartIndicator from "../../generalcomponents/LineChart"
import DonaIndicator from "../../generalcomponents/DoughnutChart"
import LineChartGastos from "../../generalcomponents/LineChartGastos"
import Preloader from '../../generalcomponents/Preloader'

const styles = {
    container: {
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    filterBtn: {
        background: '#f5a623',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#fff',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        height: '100%'
    },
    cardBody: {
        padding: '24px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '8px',
        letterSpacing: '-0.5px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#6c757d',
        marginBottom: '16px'
    },
    utilityPositive: {
        color: '#10b981',
        fontWeight: '600'
    },
    utilityNegative: {
        color: '#ef4444',
        fontWeight: '600'
    },
    legendContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
    },
    legendBadge: {
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    },
    divider: {
        border: 'none',
        borderTop: '1px solid #f0f0f0',
        margin: '24px 0'
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '16px'
    }
};

// Colores modernos para las gráficas
const colors = {
    primary: '#6366f1',      // Indigo
    secondary: '#8b5cf6',    // Violet
    success: '#10b981',      // Emerald
    warning: '#f59e0b',      // Amber
    danger: '#ef4444',       // Red
    info: '#3b82f6',         // Blue
    teal: '#14b8a6',         // Teal
    pink: '#ec4899',         // Pink
    orange: '#f97316',       // Orange
    cyan: '#06b6d4'          // Cyan
};

class Index extends Component {
    constructor(props) {
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            dataLine: [],
            dataPie: [],
            dataLineGastos: [],
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props !== nextProps) {
            this.dataLineAccumulated(nextProps)
            this.donaChart(nextProps)
            this.dataLineGastos(nextProps)
        }
    }

    date = (fecha) => {
        var d = new Date(fecha),
            months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[fecha];
    }

    dataLineAccumulated = (nextProps) => {
        let months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let array = [['x', 'datos',{ role: "annotation", type: "string" }, '%',{ role: "annotation", type: "string" }]]

        nextProps.dataCostCenter.map((data, index) => {
            let data_percent_num = data
            let gastos = nextProps.dataMaterials[index] + nextProps.dataReports[index] + nextProps.dataTableristas[index]
            array.push([months[index], data_percent_num,this.numberToCurrency(Math.round(data_percent_num/1000000,1)), gastos,this.numberToCurrency(Math.round(gastos/1000000,1))])
        })

        this.setState((state, props) => ({
            dataLine: array
        }));
    }

    dataLineGastos = (nextProps) => {
        let months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'jun', 'jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let array = [['x', 'datos',{ role: "annotation", type: "string" }, '%',{ role: "annotation", type: "string" }, '%',{ role: "annotation", type: "string" }]]

        nextProps.dataCostCenter.map((data, index) => {
            let mat = nextProps.dataMaterials[index]
            let rep = nextProps.dataReports[index]
            let tab = nextProps.dataTableristas[index]
            array.push([months[index], rep,this.numberToCurrency(Math.round(rep/1000000,1)),tab,this.numberToCurrency(Math.round(tab/1000000,1)), mat,this.numberToCurrency(Math.round(mat/1000000,1))])
        })

        this.setState((state, props) => ({
            dataLineGastos: array
        }));
    }

    donaChart = (nextProps) => {
        this.setState((state, props) => ({
            dataPie: nextProps.dataTotales
        }));
    }

    numberToCurrency = (amount) => {
        if(amount != undefined){
            var thousandsSeparator = ","
            var currencyNum = "";
            var amountString = amount.toString();
            var digits = amountString.split("");
            var countDigits = digits.length;
            var revDigits = digits.reverse();

            for (var i = 0; i < countDigits; i++) {
                if ((i % 3 == 0) && (i != 0)) {
                    currencyNum += thousandsSeparator + revDigits[i];
                } else {
                    currencyNum += digits[i];
                }
            };

            var revCurrency = currencyNum.split("").reverse().join("");
            var finalCurrency = "$" + revCurrency;
            return finalCurrency;
        }
    }

    getfacturaGastos = (value) => {
        let gastos = value[1][3];
        let facturacion = value[1][1];
        let resta = facturacion - gastos
        let porcentaje = 0
        if (facturacion > 0) {
            porcentaje = Math.round((resta/facturacion)*100,0)
        }
        return porcentaje
    }

    getfacturaVentas = (value) => {
        let porcentaje = 0
        if (value[1] != undefined) {
            let facturacion = value[1][1];
            let ventas = value[1][3];
            if (ventas > 0) {
                porcentaje = Math.round((facturacion/ventas)*100,0)
            }
        }
        return porcentaje
    }

    renderLegend = (items) => {
        return (
            <div style={styles.legendContainer}>
                {items.map((item, index) => (
                    <span key={index} style={{...styles.legendBadge, background: item.color}}>
                        <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)'}}></span>
                        {item.label}
                    </span>
                ))}
            </div>
        );
    }

    renderUtility = (value) => {
        const isPositive = value >= 0;
        return (
            <span style={isPositive ? styles.utilityPositive : styles.utilityNegative}>
                {isPositive ? '+' : ''}{value}%
            </span>
        );
    }

    render() {
        return (
            <div style={styles.container}>
                <div className="row">
                    <div className="col-md-12">
                        <div className="row">
                            <div className="col-md-8 text-left"></div>
                            <div className="col-md-4 text-right mt-1 mb-3">
                                <button
                                    style={styles.filterBtn}
                                    onClick={this.props.show}
                                    onMouseOver={(e) => e.target.style.background = '#e09000'}
                                    onMouseOut={(e) => e.target.style.background = '#f5a623'}
                                >
                                    <i className="fas fa-filter"></i>
                                    Filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* MARGEN */}
                    <div className="col-md-6 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Margen</h3>
                                        <p style={styles.subtitle}>Comparativa de ventas vs gastos mensuales</p>
                                        {this.renderLegend([
                                            { label: 'Ventas', color: colors.success },
                                            { label: 'Gastos', color: colors.primary }
                                        ])}
                                        <LineChartIndicator data={this.state.dataLine} colors={[colors.success, colors.primary]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* GASTOS */}
                    <div className="col-md-6 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Gastos</h3>
                                        <p style={styles.subtitle}>Distribución mensual por categoría</p>
                                        {this.renderLegend([
                                            { label: 'Ingeniería', color: colors.teal },
                                            { label: 'Tableristas', color: colors.warning },
                                            { label: 'Materiales', color: colors.info }
                                        ])}
                                        <LineChartGastos data={this.state.dataLineGastos} colors={[colors.teal, colors.warning, colors.info]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-12">
                        <p style={styles.sectionTitle}>Análisis Comparativo</p>
                    </div>

                    {/* FACTURACION VS GASTOS */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Facturación vs Gastos</h3>
                                        <p style={styles.subtitle}>
                                            Utilidad: {this.renderUtility(this.getfacturaGastos(this.props.facturaGastos))}
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Facturación', color: colors.success },
                                            { label: 'Gastos', color: colors.danger }
                                        ])}
                                        <LineChartIndicator data={this.props.facturaGastos} colors={[colors.success, colors.danger]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* VENTAS VS GASTOS */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Ventas vs Gastos</h3>
                                        <p style={styles.subtitle}>
                                            Utilidad: {this.renderUtility(this.getfacturaGastos(this.props.ventaGastos))}
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Ventas', color: colors.teal },
                                            { label: 'Gastos', color: colors.pink }
                                        ])}
                                        <LineChartIndicator data={this.props.ventaGastos} colors={[colors.teal, colors.pink]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FACTURACION VS VENTAS */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Facturación vs Ventas</h3>
                                        <p style={styles.subtitle}>
                                            Facturado: <span style={styles.utilityPositive}>{this.getfacturaVentas(this.props.facturaVentas)}%</span> de ventas
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Facturación', color: colors.primary },
                                            { label: 'Ventas', color: colors.cyan }
                                        ])}
                                        <LineChartIndicator data={this.props.facturaVentas} colors={[colors.primary, colors.cyan]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-12">
                        <p style={styles.sectionTitle}>Distribución</p>
                    </div>

                    {/* DISTRIBUCION DE GASTOS */}
                    <div className="col-md-6 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Distribución de Gastos</h3>
                                        <p style={styles.subtitle}>Porcentaje por categoría</p>
                                        <DonaIndicator data={this.state.dataPie} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DISTRIBUCION DE ENTRADAS */}
                    <div className="col-md-6 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Distribución de Entradas</h3>
                                        <p style={styles.subtitle}>Porcentaje por fuente</p>
                                        <DonaIndicator data={this.props.entradasTotales} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-12">
                        <p style={styles.sectionTitle}>Análisis por Área</p>
                    </div>

                    {/* INGENIERIA */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Ingeniería</h3>
                                        <p style={styles.subtitle}>
                                            Utilidad: {this.renderUtility(this.getfacturaGastos(this.props.ingenieriaComparativa))}
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Cotizado', color: colors.teal },
                                            { label: 'Gastos', color: colors.orange }
                                        ])}
                                        <LineChartIndicator data={this.props.ingenieriaComparativa} colors={[colors.teal, colors.orange]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TABLERISTA */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Tableristas</h3>
                                        <p style={styles.subtitle}>
                                            Utilidad: {this.renderUtility(this.getfacturaGastos(this.props.contratistaComparativa))}
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Cotizado', color: colors.secondary },
                                            { label: 'Gastos', color: colors.warning }
                                        ])}
                                        <LineChartIndicator data={this.props.contratistaComparativa} colors={[colors.secondary, colors.warning]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* EQUIPOS */}
                    <div className="col-md-4 mb-4">
                        <div style={styles.card}>
                            <div style={styles.cardBody}>
                                {this.props.isLoaded ? (
                                    <Preloader/>
                                ) : (
                                    <React.Fragment>
                                        <h3 style={styles.cardTitle}>Equipos</h3>
                                        <p style={styles.subtitle}>
                                            Utilidad: {this.renderUtility(this.getfacturaGastos(this.props.materialesComparativa))}
                                        </p>
                                        {this.renderLegend([
                                            { label: 'Cotizado', color: colors.info },
                                            { label: 'Ejecutado', color: colors.pink }
                                        ])}
                                        <LineChartIndicator data={this.props.materialesComparativa} colors={[colors.info, colors.pink]} />
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }
}

export default Index;
