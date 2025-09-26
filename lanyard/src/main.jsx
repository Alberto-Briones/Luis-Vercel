import React from 'react'
import { createRoot } from 'react-dom/client'
import Lanyard from './Lanyard.jsx'
import './Lanyard.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="lanyard-wrapper">
      <Lanyard position={[0, 0, 20]} gravity={[0, -40, 0]} />
    </div>
  </React.StrictMode>
)
