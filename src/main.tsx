import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.tsx';
import { TripStateProvider } from './state/store';
import { AuthProvider } from './state/auth';
import { consumeSetupToken } from './api/state';

// index.html 的自救腳本會帶 ?_r= 重抓最新網頁；載入成功就把它從網址拿掉，免得被複製分享出去。
function dropReloadParam(): void {
  const params = new URLSearchParams(location.search);
  if (!params.has('_r')) return;
  params.delete('_r');
  const qs = params.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
}

dropReloadParam();
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
