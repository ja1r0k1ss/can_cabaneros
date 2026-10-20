import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { InventoryProvider } from './store/InventoryProvider.tsx'

// iOS standalone PWAs don't refresh on their own; activate new SW versions immediately
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InventoryProvider>
      <App />
    </InventoryProvider>
  </StrictMode>,
)
