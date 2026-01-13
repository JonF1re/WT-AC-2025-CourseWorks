import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.tsx'

import './styles/variables.css';
import './styles/layout.css';
import './styles/buttons.css';
import './styles/forms.css';
import './styles/alerts.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)