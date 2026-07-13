import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import './index.css'
import App from './App.jsx'

if (WebApp && typeof WebApp.ready === 'function') {
  WebApp.ready();
} else if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
