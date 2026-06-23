import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 3,
      staleTime: 3000, // 3 seconds stale time before considered obsolete
    },
  },
});

// Suppress unhandled cross-origin or extension "Script error." references
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = String(message || "");
    if (errorMsg.includes("Script error") || errorMsg.includes("Script error.") || !source) {
      console.warn("[Muted error] Cross-origin or browser extension Script error suppressed:", message);
      return true; // Stop bubbling
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason ? String(event.reason.message || event.reason) : "";
    if (reasonMsg.includes("Script error") || reasonMsg.includes("Script error.")) {
      console.warn("[Muted promise rejection] Supressed cross-origin promise rejection:", reasonMsg);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
