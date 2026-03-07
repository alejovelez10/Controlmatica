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

class DashboardHome extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      counts: null,
      loading: true,
      error: false
    };
  }

  componentDidMount() {
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

  render() {
    const { userName } = this.props;
    const { counts, loading, error } = this.state;

    const visibleCards = counts
      ? CARD_CONFIG.filter(c => counts[c.key] && counts[c.key] > 0)
      : [];

    return (
      <div style={s.container}>
        {/* Header */}
        <div style={s.headerCard}>
          <div style={s.headerLeft}>
            <div style={s.avatarCircle}>
              <i className="fas fa-user" style={{ fontSize: '22px', color: '#f5a623' }}></i>
            </div>
            <div>
              <h1 style={s.greeting}>Bienvenido, {userName}</h1>
              <p style={s.subtitle}>
                <i className="fas fa-chart-pie" style={{ marginRight: '6px' }}></i>
                Resumen de tu actividad
              </p>
            </div>
          </div>
          {!loading && !error && visibleCards.length > 0 && (
            <div style={s.headerBadge}>
              <span style={s.badgeNumber}>{visibleCards.length}</span>
              <span style={s.badgeLabel}>modulos activos</span>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={s.grid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={s.skeletonCard}>
                <div style={s.skeletonIcon}></div>
                <div style={s.skeletonLine}></div>
                <div style={{ ...s.skeletonLine, width: '60%' }}></div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={s.emptyState}>
            <div style={s.emptyIconWrap}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '32px', color: '#f59e0b' }}></i>
            </div>
            <p style={s.emptyText}>Error al cargar los datos</p>
            <button
              style={s.retryBtn}
              onClick={() => {
                this.setState({ loading: true, error: false });
                this.componentDidMount();
              }}
            >
              <i className="fas fa-redo" style={{ marginRight: '6px' }}></i>
              Reintentar
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visibleCards.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIconWrap}>
              <i className="fas fa-inbox" style={{ fontSize: '32px', color: '#cbd5e1' }}></i>
            </div>
            <p style={s.emptyText}>No tienes registros aun</p>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && visibleCards.length > 0 && (
          <div style={s.grid}>
            {visibleCards.map(card => (
              <a
                key={card.key}
                href={card.link}
                style={s.card}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px ${card.color}20, 0 4px 8px rgba(0,0,0,0.06)`;
                  e.currentTarget.style.borderColor = card.color + '40';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                {/* Decorative top bar */}
                <div style={{ ...s.cardBar, background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}></div>

                <div style={s.cardContent}>
                  <div style={s.cardRow}>
                    <div style={{ ...s.iconCircle, background: card.bg }}>
                      <i className={`fas ${card.icon}`} style={{ fontSize: '18px', color: card.color }}></i>
                    </div>
                    <div style={s.arrowWrap}>
                      <i className="fas fa-arrow-right" style={{ fontSize: '12px', color: '#cbd5e1' }}></i>
                    </div>
                  </div>

                  <div style={s.countWrap}>
                    <span style={{ ...s.count, color: card.color }}>{this.formatCount(counts[card.key])}</span>
                  </div>

                  <p style={s.label}>{card.label}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
}

const s = {
  container: {
    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '4px'
  },

  // Header
  headerCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '16px',
    padding: '28px 32px',
    marginBottom: '28px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  avatarCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#fffbeb',
    border: '2px solid #f5a62340',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  greeting: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 2px 0'
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    fontWeight: '500'
  },
  headerBadge: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '10px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  badgeNumber: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#16a34a'
  },
  badgeLabel: {
    fontSize: '13px',
    color: '#4ade80',
    fontWeight: '500'
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '18px'
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: '16px',
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
    height: '4px',
    width: '100%'
  },
  cardContent: {
    padding: '20px 22px 22px'
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px'
  },
  iconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  countWrap: {
    marginBottom: '4px'
  },
  count: {
    fontSize: '34px',
    fontWeight: '800',
    lineHeight: 1,
    letterSpacing: '-1px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    margin: '6px 0 0 0',
    letterSpacing: '0.01em'
  },

  // Skeleton
  skeletonCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px 22px',
    border: '1px solid #f1f5f9'
  },
  skeletonIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginBottom: '18px'
  },
  skeletonLine: {
    height: '14px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    marginBottom: '10px',
    width: '80%'
  },

  // Empty
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #f1f5f9'
  },
  emptyIconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#f8fafc',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '15px',
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

export default DashboardHome;
