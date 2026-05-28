import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Catch any render errors and show them visibly on screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  componentDidCatch(error, info) {
    this.setState({ error: error.toString() + '\n' + info.componentStack })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#0d1117', color: '#f85149', fontFamily: 'monospace',
          padding: 40, minHeight: '100vh', whiteSpace: 'pre-wrap', fontSize: 14
        }}>
          <h2 style={{color:'#f85149', marginBottom: 20}}>❌ App crashed — please copy this and send it:</h2>
          {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
