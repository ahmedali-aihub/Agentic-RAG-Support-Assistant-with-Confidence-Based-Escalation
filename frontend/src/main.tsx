import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Console from './App.tsx'
import Landing from './landing/Landing.tsx'
import Queue from './queue/Queue.tsx'
import TicketStatus from './ticket/TicketStatus.tsx'

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
  const isQueue = hash.startsWith('#/queue')
  const isTicket = hash.startsWith('#/ticket')
  const isOperator = isConsole || isQueue

  // The operator surfaces and the landing page are opposite themes, so the
  // document surface follows the route -- otherwise the light page would paint
  // over a black ground. The ticket lookup is a customer-facing page, so it
  // shares the landing surface rather than the dark operator console.
  useEffect(() => {
    document.documentElement.dataset.surface = isOperator ? 'console' : 'landing'
  }, [isOperator])

  if (isQueue) return <Queue />
  if (isTicket) return <TicketStatus />
  return isConsole ? <Console /> : <Landing />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
