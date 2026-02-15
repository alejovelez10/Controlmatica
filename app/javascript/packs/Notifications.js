import React from 'react';
import ItemNotification from "../components/Notifications/ItemNotification"
import WebpackerReact from 'webpacker-react';

const styles = {
    container: {
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    card: {
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
    },
    cardBody: {
        padding: '24px'
    },
    tabsContainer: {
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #f0f0f0',
        paddingBottom: '0'
    },
    tab: {
        padding: '12px 24px',
        border: 'none',
        background: 'transparent',
        fontSize: '14px',
        fontWeight: '500',
        color: '#6c757d',
        cursor: 'pointer',
        borderBottom: '3px solid transparent',
        marginBottom: '-2px',
        transition: 'all 0.2s ease'
    },
    tabActive: {
        color: '#f5a623',
        borderBottomColor: '#f5a623'
    },
    badge: {
        background: '#f5a623',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        marginLeft: '8px'
    }
};

class Notifications extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            currentTab: "pending",
            pendingCount: 0,
            revisedCount: 0
        }
    }

    handleChangeTab = (tab) => {
        this.setState({
            currentTab: tab
        })
    }

    updateCounts = (count, type) => {
        if (type === "pending") {
            this.setState({ pendingCount: count });
        } else {
            this.setState({ revisedCount: count });
        }
    }

    render() {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.cardBody}>
                        <div style={styles.tabsContainer}>
                            <button
                                style={{...styles.tab, ...(this.state.currentTab === "pending" ? styles.tabActive : {})}}
                                onClick={() => this.handleChangeTab("pending")}
                            >
                                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                                Pendientes de revisión
                                {this.state.pendingCount > 0 && (
                                    <span style={styles.badge}>{this.state.pendingCount}</span>
                                )}
                            </button>

                            <button
                                style={{...styles.tab, ...(this.state.currentTab === "revised" ? styles.tabActive : {})}}
                                onClick={() => this.handleChangeTab("revised")}
                            >
                                <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                                Revisadas
                                {this.state.revisedCount > 0 && (
                                    <span style={{...styles.badge, background: '#48bb78'}}>{this.state.revisedCount}</span>
                                )}
                            </button>
                        </div>

                        {this.state.currentTab == "pending" && (
                            <ItemNotification
                                url={"/get_notifications/pending"}
                                updateState={"/update_state"}
                                updateAll={"/register_edit_update_all"}
                                state={"pending"}
                                from={this.props.from}
                                estados={this.props.estados}
                                onCountUpdate={(count) => this.updateCounts(count, "pending")}
                            />
                        )}

                        {this.state.currentTab == "revised" && (
                            <ItemNotification
                                url={"/get_notifications/revised"}
                                updateState={"/update_state"}
                                updateAll={"/register_edit_update_all"}
                                state={"revised"}
                                from={this.props.from}
                                estados={this.props.estados}
                                onCountUpdate={(count) => this.updateCounts(count, "revised")}
                            />
                        )}

                    </div>
                </div>
            </div>
        );
    }
}

export default Notifications;
WebpackerReact.setup({ Notifications });
