import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Mount React app if there's a root element
const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Initialize any global functionality for EJS pages
document.addEventListener('DOMContentLoaded', () => {
  console.log('uWork app initialized with Vite build system');
  
  // Add any global React component mounting logic here
  // For example, mounting React components in EJS templates:
  
  // Mount job search component if element exists
  const jobSearchElement = document.getElementById('react-job-search');
  if (jobSearchElement) {
    // Import and mount job search component
    // ReactDOM.createRoot(jobSearchElement).render(<JobSearchComponent />);
  }
  
  // Mount dashboard widgets if elements exist
  const dashboardWidgets = document.querySelectorAll('[data-react-widget]');
  dashboardWidgets.forEach(widget => {
    const widgetType = widget.getAttribute('data-react-widget');
    // Mount appropriate React component based on widget type
    // ReactDOM.createRoot(widget).render(<DashboardWidget type={widgetType} />);
  });
}); 