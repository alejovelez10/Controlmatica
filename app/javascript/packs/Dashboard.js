import React from 'react';
import ReactDOM from 'react-dom';
import DashboardHome from '../components/Dashboard/DashboardHome';

document.addEventListener('DOMContentLoaded', () => {
  const node = document.getElementById('Dashboard-react-component');
  if (node) {
    const userName = node.getAttribute('data-user-name');
    const userEmail = node.getAttribute('data-user-email');
    ReactDOM.render(
      <DashboardHome userName={userName} userEmail={userEmail} />,
      node
    );
  }
});
