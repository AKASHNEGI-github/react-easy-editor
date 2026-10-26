import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './site.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
