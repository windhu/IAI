import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerPwa } from './pwa/pwa';
import { App } from './ui/App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerPwa();
