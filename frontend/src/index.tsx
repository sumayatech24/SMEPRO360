import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { applyTheme } from './store/themeStore';

// Apply saved theme before React renders to avoid flash
try {
  const stored = localStorage.getItem('smepro360-theme');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.isDark) applyTheme(true);
  }
} catch {}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
