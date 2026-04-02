import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter as Router} from'react-router-dom'
import './index.css'
import App from './App.jsx'
import {ToastContainer} from 'react-toastify'
import {Provider} from 'react-redux'
import store from './ReduxApi'
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

document.addEventListener('wheel', (e) => {
  if (document.activeElement?.type === 'number') document.activeElement.blur()
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
    <Provider store={store}>
    <App />
    <ToastContainer 
    hideProgressBar
    autoClose={1200}
    />
    </Provider>
    </Router>
  </StrictMode>,
)
