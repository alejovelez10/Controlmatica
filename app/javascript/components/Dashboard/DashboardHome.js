import React from 'react';

const CARD_CONFIG = [
  { key: 'cost_centers',    label: 'Centros de Costos',     icon: 'fa-building',            color: '#3b82f6', bg: '#eff6ff',  link: '/cost_centers' },
  { key: 'sales_orders',    label: 'Ordenes de Compra',     icon: 'fa-shopping-cart',        color: '#10b981', bg: '#ecfdf5',  link: '/sales_orders' },
  { key: 'materials',       label: 'Materiales',            icon: 'fa-cubes',               color: '#f59e0b', bg: '#fffbeb',  link: '/materials' },
  { key: 'contractors',     label: 'Tableristas',           icon: 'fa-users-cog',           color: '#8b5cf6', bg: '#f5f3ff',  link: '/contractors' },
  { key: 'report_expenses', label: 'Gastos',                icon: 'fa-receipt',             color: '#ef4444', bg: '#fef2f2',  link: '/report_expenses' },
  { key: 'expense_ratios',  label: 'Control de Gastos',     icon: 'fa-file-invoice-dollar', color: '#ec4899', bg: '#fdf2f8',  link: '/expense_ratios' },
  { key: 'shifts',          label: 'Turnos',                icon: 'fa-calendar-alt',        color: '#06b6d4', bg: '#ecfeff',  link: '/shifts' },
  { key: 'reports',         label: 'Reportes de Servicio',  icon: 'fa-clipboard-list',      color: '#f97316', bg: '#fff7ed',  link: '/reports' },
  { key: 'commissions',     label: 'Comisiones',            icon: 'fa-percentage',          color: '#14b8a6', bg: '#f0fdfa',  link: '/commissions' },
  { key: 'customer_reports',label: 'Reportes de Cliente',   icon: 'fa-file-alt',            color: '#6366f1', bg: '#eef2ff',  link: '/customer_reports' },
];

// Inject global CSS for animations and responsive
const STYLE_ID = 'dashboard-home-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes dashboard-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .dashboard-skeleton-anim {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%) !important;
      background-size: 200% 100% !important;
      animation: dashboard-shimmer 1.5s infinite !important;
    }
  `;
  document.head.appendChild(style);
}

class DashboardHome extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      counts: null,
      loading: true,
      error: false,
      isMobile: window.innerWidth < 640,
      isTablet: window.innerWidth >= 640 && window.innerWidth < 1024
    };
    this.handleResize = this.handleResize.bind(this);
  }

  componentDidMount() {
    injectStyles();
    window.addEventListener('resize', this.handleResize);
    this.fetchCounts();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    const w = window.innerWidth;
    this.setState({
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024
    });
  }

  fetchCounts() {
    fetch('/home/dashboard_counts')
      .then(res => {
        if (!res.ok) throw new Error('Error');
        return res.json();
      })
      .then(data => this.setState({ counts: data, loading: false }))
      .catch(() => this.setState({ error: true, loading: false }));
  }

  formatCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n;
  }

  getStyles() {
    const { isMobile, isTablet } = this.state;

    return {
      container: {
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: isMobile ? '0' : '4px'
      },
      headerCard: {
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: isMobile ? '12px' : '16px',
        padding: isMobile ? '18px 16px' : '28px 32px',
        marginBottom: isMobile ? '18px' : '28px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: isMobile ? '12px' : '16px'
      },
      headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        minWidth: 0,
        flex: 1
      },
      avatarCircle: {
        width: isMobile ? '42px' : '52px',
        height: isMobile ? '42px' : '52px',
        minWidth: isMobile ? '42px' : '52px',
        borderRadius: '50%',
        background: '#fffbeb',
        border: '2px solid #f5a62340',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      greeting: {
        fontSize: isMobile ? '17px' : '22px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 2px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      subtitle: {
        fontSize: isMobile ? '12px' : '13px',
        color: '#94a3b8',
        margin: 0,
        fontWeight: '500'
      },
      headerBadge: {
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: isMobile ? '10px' : '12px',
        padding: isMobile ? '8px 14px' : '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      badgeNumber: {
        fontSize: isMobile ? '16px' : '20px',
        fontWeight: '700',
        color: '#16a34a'
      },
      badgeLabel: {
        fontSize: isMobile ? '11px' : '13px',
        color: '#4ade80',
        fontWeight: '500'
      },
      grid: {
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(2, 1fr)'
          : isTablet
            ? 'repeat(3, 1fr)'
            : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: isMobile ? '12px' : '18px'
      },
      card: {
        background: '#fff',
        borderRadius: isMobile ? '12px' : '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        display: 'block',
        position: 'relative'
      },
      cardBar: {
        height: isMobile ? '3px' : '4px',
        width: '100%'
      },
      cardContent: {
        padding: isMobile ? '14px 14px 16px' : '20px 22px 22px'
      },
      cardRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '12px' : '18px'
      },
      iconCircle: {
        width: isMobile ? '38px' : '46px',
        height: isMobile ? '38px' : '46px',
        borderRadius: isMobile ? '10px' : '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      iconSize: isMobile ? '15px' : '18px',
      arrowWrap: {
        width: isMobile ? '24px' : '28px',
        height: isMobile ? '24px' : '28px',
        borderRadius: '8px',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      countWrap: {
        marginBottom: '2px'
      },
      count: {
        fontSize: isMobile ? '24px' : '34px',
        fontWeight: '800',
        lineHeight: 1,
        letterSpacing: '-1px'
      },
      label: {
        fontSize: isMobile ? '11px' : '13px',
        fontWeight: '600',
        color: '#64748b',
        margin: '4px 0 0 0',
        letterSpacing: '0.01em',
        lineHeight: '1.3'
      },
      skeletonCard: {
        background: '#fff',
        borderRadius: isMobile ? '12px' : '16px',
        padding: isMobile ? '16px 14px' : '24px 22px',
        border: '1px solid #f1f5f9'
      },
      skeletonIcon: {
        width: isMobile ? '38px' : '46px',
        height: isMobile ? '38px' : '46px',
        borderRadius: isMobile ? '10px' : '14px',
        marginBottom: isMobile ? '12px' : '18px'
      },
      skeletonLine: {
        height: '14px',
        borderRadius: '6px',
        marginBottom: '10px',
        width: '80%'
      },
      emptyState: {
        textAlign: 'center',
        padding: isMobile ? '40px 16px' : '60px 20px',
        background: '#fff',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid #f1f5f9'
      },
      emptyIconWrap: {
        width: isMobile ? '60px' : '72px',
        height: isMobile ? '60px' : '72px',
        borderRadius: '50%',
        background: '#f8fafc',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      },
      emptyText: {
        fontSize: isMobile ? '14px' : '15px',
        color: '#94a3b8',
        margin: '0 0 16px 0'
      },
      retryBtn: {
        background: '#f5a623',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
      }
    };
  }

  render() {
    const { userName } = this.props;
    const { counts, loading, error, isMobile } = this.state;
    const st = this.getStyles();

    const visibleCards = counts
      ? CARD_CONFIG.filter(c => counts[c.key] && counts[c.key] > 0)
      : [];

    return (
      <div style={st.container}>
        {/* Header */}
        <div style={st.headerCard}>
          <div style={st.headerLeft}>
            <div style={st.avatarCircle}>
              <i className="fas fa-user" style={{ fontSize: isMobile ? '18px' : '22px', color: '#f5a623' }}></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={st.greeting}>Hola, {userName}</h1>
              <p style={st.subtitle}>
                <i className="fas fa-chart-pie" style={{ marginRight: '6px' }}></i>
                Resumen de tu actividad
              </p>
            </div>
          </div>
          {!loading && !error && visibleCards.length > 0 && (
            <div style={st.headerBadge}>
              <span style={st.badgeNumber}>{visibleCards.length}</span>
              <span style={st.badgeLabel}>modulos activos</span>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={st.grid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={st.skeletonCard}>
                <div className="dashboard-skeleton-anim" style={st.skeletonIcon}></div>
                <div className="dashboard-skeleton-anim" style={st.skeletonLine}></div>
                <div className="dashboard-skeleton-anim" style={{ ...st.skeletonLine, width: '60%' }}></div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={st.emptyState}>
            <div style={st.emptyIconWrap}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: isMobile ? '26px' : '32px', color: '#f59e0b' }}></i>
            </div>
            <p style={st.emptyText}>Error al cargar los datos</p>
            <button
              style={st.retryBtn}
              onClick={() => {
                this.setState({ loading: true, error: false });
                this.fetchCounts();
              }}
            >
              <i className="fas fa-redo" style={{ marginRight: '6px' }}></i>
              Reintentar
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visibleCards.length === 0 && (
          <div style={st.emptyState}>
            <div style={st.emptyIconWrap}>
              <i className="fas fa-inbox" style={{ fontSize: isMobile ? '26px' : '32px', color: '#cbd5e1' }}></i>
            </div>
            <p style={st.emptyText}>No tienes registros aun</p>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && visibleCards.length > 0 && (
          <div style={st.grid}>
            {visibleCards.map(card => (
              <a
                key={card.key}
                href={card.link}
                style={st.card}
                onMouseEnter={e => {
                  if (isMobile) return;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px ${card.color}20, 0 4px 8px rgba(0,0,0,0.06)`;
                  e.currentTarget.style.borderColor = card.color + '40';
                }}
                onMouseLeave={e => {
                  if (isMobile) return;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                <div style={{ ...st.cardBar, background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}></div>

                <div style={st.cardContent}>
                  <div style={st.cardRow}>
                    <div style={{ ...st.iconCircle, background: card.bg }}>
                      <i className={`fas ${card.icon}`} style={{ fontSize: st.iconSize, color: card.color }}></i>
                    </div>
                    {!isMobile && (
                      <div style={st.arrowWrap}>
                        <i className="fas fa-arrow-right" style={{ fontSize: '12px', color: '#cbd5e1' }}></i>
                      </div>
                    )}
                  </div>

                  <div style={st.countWrap}>
                    <span style={{ ...st.count, color: card.color }}>{this.formatCount(counts[card.key])}</span>
                  </div>

                  <p style={st.label}>{card.label}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default DashboardHome;
