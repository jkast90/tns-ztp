import React from 'react'
import ReactDOM from 'react-dom/client'
import { configureServices, getLocalApiUrl } from '@core'
import App from './App'
import './index.css'

// Initialize services with stored API URL
configureServices({ baseUrl: getLocalApiUrl() });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
