import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No #root element — index.html is wrong.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
