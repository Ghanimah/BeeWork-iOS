import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

const isNative = (() => {
  try { return Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android'; } catch { return false; }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isNative ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter>
      <App />
      </BrowserRouter>
    )}
  </StrictMode>
);