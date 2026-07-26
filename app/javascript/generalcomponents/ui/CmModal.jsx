import React from "react";
import PropTypes from "prop-types";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

class CmModal extends React.Component {
  render() {
    const { isOpen, toggle, title, size, footer, children, hideHeader } = this.props;
    const modalClass = hideHeader ? "cm-modal cm-modal-custom-layout" : "cm-modal";

    return (
      <Modal isOpen={isOpen} toggle={toggle} size={size || "md"} className={modalClass}>
        {!hideHeader && <ModalHeader toggle={toggle}>{title}</ModalHeader>}
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </Modal>
    );
  }
}

CmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  title: PropTypes.node,
  size: PropTypes.string,
  footer: PropTypes.node,
  children: PropTypes.node.isRequired,
  hideHeader: PropTypes.bool
};

export default CmModal;
