import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/ToastContext';
import './index.css';

// Suppress Vite HMR WebSocket errors in AI Studio iframe
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason.message?.includes('WebSocket') || 
      event.reason.message?.includes('HMR') ||
      event.reason.name === 'Error' && event.reason.message === 'WebSocket closed without opened.'
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider><App /></ToastProvider>
  </StrictMode>,
);
