import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Custom dropdown for table row actions.
 * Uses React Portal to render menu in document.body,
 * so it's never clipped by overflow:hidden/auto containers.
 *
 * Usage:
 *   <ActionButtons actions={[
 *     { label: 'Editar', icon: 'fa-pen', onClick: () => this.edit(item) },
 *     { label: 'Eliminar', icon: 'fa-trash', onClick: () => this.delete(item.id), danger: true },
 *   ]} />
 */
class ActionButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
    this.btnRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  toggle(e) {
    e.stopPropagation();
    const next = !this.state.open;
    this.setState({ open: next });

    if (next) {
      // Defer so this click doesn't immediately close
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', this.handleClickOutside);
    }
  }

  handleClickOutside() {
    this.setState({ open: false });
    document.removeEventListener('click', this.handleClickOutside);
  }

  getMenuPosition() {
    if (!this.btnRef.current) return { top: 0, left: 0 };
    const rect = this.btnRef.current.getBoundingClientRect();
    const menuWidth = 180;

    // Open to the right of the button
    let left = rect.right + 4;
    // If it overflows the right edge, flip to left of button
    if (left + menuWidth > window.innerWidth - 8) {
      left = rect.left - menuWidth - 4;
    }
    // Never go off left edge
    if (left < 8) left = 8;

    let top = rect.top;
    // If it would go off bottom, shift up
    if (top + 200 > window.innerHeight) {
      top = window.innerHeight - 208;
    }

    return { top, left };
  }

  renderMenu() {
    if (!this.state.open) return null;
    const { actions } = this.props;
    const pos = this.getMenuPosition();

    const menu = (
      <div className="cm-dropdown-portal-overlay" onClick={() => this.handleClickOutside()}>
        <div
          className="cm-dropdown-portal-menu"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              className={`cm-dropdown-portal-item${action.danger ? ' cm-dropdown-portal-danger' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                this.setState({ open: false });
                document.removeEventListener('click', this.handleClickOutside);
                action.onClick();
              }}
            >
              {action.icon && <i className={`fas ${action.icon}`}></i>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );

    return ReactDOM.createPortal(menu, document.body);
  }

  render() {
    const { actions } = this.props;
    if (!actions || actions.length === 0) return null;

    return (
      <React.Fragment>
        <button
          ref={this.btnRef}
          className="cm-dropdown-portal-trigger"
          type="button"
          onClick={(e) => this.toggle(e)}
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
        {this.renderMenu()}
      </React.Fragment>
    );
  }
}

export default ActionButtons;
