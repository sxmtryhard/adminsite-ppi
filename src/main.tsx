import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Captura temprana del evento de instalación (beforeinstallprompt).
import './lib/installPrompt'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
