import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Console from './App.tsx'
import Landing from './landing/Landing.tsx'

/**
 * Hash routing rather than a router dependency: there are two routes, and a
 * hash works unchanged on any static host without server rewrites.
 */
function Root() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const isConsole = hash.startsWith('#/app')

  // The two surfaces are opposite themes, so the document theme follows the
  // route -- otherwise the light page would paint over a black ground.
  useEffect(() => {
    document.documentElement.dataset.surface = isConsole ? 'console' : 'landing'
  }, [isConsole])

  return isConsole ? <Console /> : <Landing />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
