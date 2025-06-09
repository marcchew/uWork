import React from 'react'

function App() {
  return (
    <div className="app">
      <div className="container py-4">
        <div className="alert alert-info" role="alert">
          <h4 className="alert-heading">
            <i className="bi bi-info-circle me-2"></i>
            React + Vite Integration Active
          </h4>
          <p className="mb-0">
            This is a React component rendered through Vite build system. 
            The main uWork application uses EJS templates with React components 
            for enhanced interactivity.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App 