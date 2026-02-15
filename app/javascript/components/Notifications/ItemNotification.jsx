import React from 'react';
import Pagination from "react-js-pagination";
import ReactHtmlParser from 'react-html-parser';

const styles = {
    container: {
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    btnReviewAll: {
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
    btnDisabled: {
        background: '#adb5bd',
        cursor: 'not-allowed'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
    },
    card: {
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
    },
    cardHighlight: {
        borderColor: '#f5a623',
        boxShadow: '0 4px 12px rgba(245, 166, 35, 0.2)'
    },
    cardHeader: {
        background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    moduleTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#f5a623',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textAlign: 'left'
    },
    statusIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    statusPending: {
        background: '#fff3cd',
        color: '#856404'
    },
    statusRevised: {
        background: '#d4edda',
        color: '#155724'
    },
    cardBody: {
        padding: '16px'
    },
    userInfo: {
        fontSize: '12px',
        color: '#6c757d',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    description: {
        fontSize: '13px',
        color: '#495057',
        lineHeight: '1.5',
        marginBottom: '12px',
        textAlign: 'left'
    },
    marginBox: {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0'
    },
    marginRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    marginLabel: {
        fontSize: '12px',
        color: '#6c757d'
    },
    marginValueGood: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#28a745'
    },
    marginValueBad: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#dc3545'
    },
    costCenterInfo: {
        fontSize: '12px',
        color: '#6c757d',
        background: '#f8f9fa',
        padding: '8px 12px',
        borderRadius: '6px',
        marginTop: '8px'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#6c757d'
    },
    emptyIcon: {
        fontSize: '48px',
        color: '#dee2e6',
        marginBottom: '16px'
    },
    pagination: {
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    paginationInfo: {
        fontSize: '14px',
        color: '#6c757d'
    }
};

class ItemNotification extends React.Component {
    constructor(props){
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            isUpdating: false,
            activePage: 1,
            countPage: 12,
            totalData: 0
        }
    }

    componentDidMount = () => {
        this.loadData();
    }

    loadData = () => {
        fetch(this.props.url, {
            method: 'GET',
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.data,
                totalData: data.total,
                isLoaded: false,
                isUpdating: false
            });
            if (this.props.onCountUpdate) {
                this.props.onCountUpdate(data.total);
            }
        });
    }

    handlePageChange = (pageNumber) => {
        fetch(`${this.props.url}?page=${pageNumber}`, {
            method: 'GET',
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.setState({
                data: data.data,
                totalData: data.total,
                activePage: pageNumber,
                isLoaded: false
            })
        });
    }

    handleClickUpdate = (register_edit_id) => {
        fetch(`${this.props.updateState}/${register_edit_id}`, {
            method: 'PATCH',
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.loadData();
        });
    }

    handleClickUpdateAll = () => {
        this.setState({ isUpdating: true })
        fetch(this.props.updateAll, {
            method: 'PATCH',
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.loadData();
        });
    }

    render() {
        const isPending = this.props.state === "pending";

        return (
            <div style={styles.container}>
                <style>{`
                    .notifications-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                    }
                    @media (max-width: 1200px) {
                        .notifications-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    @media (max-width: 768px) {
                        .notifications-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    .notification-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .status-icon:hover {
                        transform: scale(1.1);
                    }
                    .pagination {
                        display: flex;
                        gap: 4px;
                        margin: 0;
                        padding: 0;
                        list-style: none;
                    }
                    .pagination .page-item .page-link {
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        padding: 8px 12px;
                        color: #495057;
                        font-size: 14px;
                        text-decoration: none;
                        transition: all 0.2s ease;
                    }
                    .pagination .page-item .page-link:hover {
                        background: #f8f9fa;
                        border-color: #f5a623;
                        color: #f5a623;
                    }
                    .pagination .page-item.active .page-link {
                        background: #f5a623;
                        border-color: #f5a623;
                        color: #fff;
                    }
                `}</style>

                {(isPending && this.state.data.length >= 1 && this.props.estados && this.props.estados.review) && (
                    <div style={styles.header}>
                        <span style={styles.paginationInfo}>
                            {this.state.totalData} notificaciones pendientes
                        </span>
                        <button
                            style={{...styles.btnReviewAll, ...(this.state.isUpdating ? styles.btnDisabled : {})}}
                            disabled={this.state.isUpdating}
                            onClick={() => this.handleClickUpdateAll()}
                        >
                            <i className={this.state.isUpdating ? "fas fa-spinner fa-spin" : "fas fa-check-double"}></i>
                            {this.state.isUpdating ? "Actualizando..." : "Revisar todas"}
                        </button>
                    </div>
                )}

                {this.state.data.length >= 1 ? (
                    <div className="notifications-grid">
                        {this.state.data.map(accion => {
                            const isHighlighted = this.props.from != null && accion.id == this.props.from;

                            return (
                                <div
                                    className="notification-card"
                                    key={accion.id}
                                    style={{...styles.card, ...(isHighlighted ? styles.cardHighlight : {})}}
                                >
                                    <div style={styles.cardHeader}>
                                        <div>
                                            <p style={styles.moduleTitle}>
                                                <i className="fas fa-bell"></i>
                                                {accion.module}
                                            </p>
                                        </div>

                                        {this.props.estados && this.props.estados.review && (
                                            <div
                                                className="status-icon"
                                                style={{
                                                    ...styles.statusIcon,
                                                    ...(isPending ? styles.statusPending : styles.statusRevised)
                                                }}
                                                onClick={() => isPending && this.handleClickUpdate(accion.id)}
                                                title={isPending ? "Marcar como revisada" : "Revisada"}
                                            >
                                                <i className={isPending ? "fas fa-exclamation" : "fas fa-check"}></i>
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.cardBody}>
                                        <div style={styles.userInfo}>
                                            <i className="fas fa-user"></i>
                                            <strong>{accion.user ? accion.user.names : ''}</strong>
                                            <span style={{ margin: '0 4px' }}>-</span>
                                            <i className="fas fa-calendar-alt"></i>
                                            {accion.date_update}
                                        </div>

                                        <div style={styles.description}>
                                            {ReactHtmlParser(accion.description)}
                                        </div>

                                        {accion.real != undefined && (
                                            <div style={styles.marginBox}>
                                                <div style={styles.marginRow}>
                                                    <span style={styles.marginLabel}>Margen mínimo:</span>
                                                    <span style={styles.marginValueGood}>{accion.expected}%</span>
                                                </div>
                                                <div style={styles.marginRow}>
                                                    <span style={styles.marginLabel}>Real:</span>
                                                    <span style={styles.marginValueBad}>{accion.real}%</span>
                                                </div>

                                                {accion.cost_center && (
                                                    <div style={styles.costCenterInfo}>
                                                        <i className="fas fa-sitemap" style={{ marginRight: '6px' }}></i>
                                                        <strong>{accion.cost_center.code}</strong>
                                                        {accion.cost_center.description && (
                                                            <span> - {accion.cost_center.description}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>
                            <i className={isPending ? "fas fa-bell-slash" : "fas fa-inbox"}></i>
                        </div>
                        <h5 style={{ marginBottom: '8px', color: '#495057' }}>
                            No hay notificaciones {isPending ? "pendientes" : "revisadas"}
                        </h5>
                        <p style={{ margin: 0 }}>
                            {isPending
                                ? "Todas las alertas han sido revisadas"
                                : "Aún no se han revisado alertas"}
                        </p>
                    </div>
                )}

                {this.state.data.length > 0 && (
                    <div style={styles.pagination}>
                        <span style={styles.paginationInfo}>
                            Mostrando {this.state.data.length} de {this.state.totalData}
                        </span>

                        {this.state.totalData > this.state.countPage && (
                            <Pagination
                                hideNavigation
                                activePage={this.state.activePage}
                                itemsCountPerPage={this.state.countPage}
                                itemClass="page-item"
                                innerClass="pagination"
                                linkClass="page-link"
                                totalItemsCount={this.state.totalData}
                                pageRangeDisplayed={5}
                                onChange={this.handlePageChange}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }
}

export default ItemNotification;
