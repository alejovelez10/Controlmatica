import React from "react";
import PropTypes from "prop-types";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

class CmModal extends React.Component {
  render() {
    const { isOpen, toggle, title, size, footer, children } = this.props;

    return (
      <Modal isOpen={isOpen} toggle={toggle} size={size || "md"} className="cm-modal">
        <ModalHeader toggle={toggle}>{title}</ModalHeader>
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </Modal>
    );
  }
}

CmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  size: PropTypes.string,
  footer: PropTypes.node,
  children: PropTypes.node.isRequired
};

export default CmModal;
