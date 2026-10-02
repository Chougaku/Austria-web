import { useEffect, useState, type JSX } from 'react';
import { meta } from './data';
import { ItineraryProvider } from './state/itinerary';
import Home from './pages/Home';
import LoginModal from './components/LoginModal';
import Header from './components/Header';
import DailyPlan from './pages/DailyPlan';
import Food from './pages/Food';
import Places from './pages/Places';
import Transport from './pages/Transport';
import AreaMap from './pages/AreaMap';
import Guides from './pages/Guides';
import { TABS, type TabKey } from './lib/tabs';
import { countdownDays } from './lib/countdown';

export { countdownDays };
export type { TabKey };

const PAGES: Record<TabKey, () => JSX.Element> = {
  home: Home, plan: DailyPlan, food: Food, places: Places, trans: Transport, map: AreaMap, guides: Guides,
};

export function parseHash(hash: string): TabKey {
  const raw = hash.replace('#', '');
  return (TABS.some(([k]) => k === raw) ? raw : 'home') as TabKey;
}

export default function App() {
  const [tab, setTab] = useState<TabKey>(() => parseHash(location.hash));
  useEffect(() => {
    const onHash = () => setTab(parseHash(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const Page = PAGES[tab];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header tab={tab} onNavigate={(k) => { location.hash = k; }} />
      <LoginModal />
      <ItineraryProvider>
        <main className="page-main">
          <div className="page-enter" key={tab}><Page /></div>
        </main>
      </ItineraryProvider>
      <footer style={{
        borderTop: '1px solid var(--line)', padding: '18px 20px', textAlign: 'center',
        fontSize: 11.5, color: 'var(--brown)', letterSpacing: '.08em',
      }}>
        資料來源：Austria-vault wiki・資料建置於 {new Date(meta.builtAt).toLocaleString('zh-TW')}
      </footer>
    </div>
  );
}
