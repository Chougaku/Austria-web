import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.tsx';
import { TripStateProvider } from './state/store';
import { AuthProvider } from './state/auth';
import { consumeSetupToken } from './api/state';

consumeSetupToken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TripStateProvider>
        <App />
      </TripStateProvider>
    </AuthProvider>
  </StrictMode>,
);
