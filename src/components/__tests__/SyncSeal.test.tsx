// @vitest-environment jsdom
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TripStateProvider } from '../../state/store';
import SyncSeal from '../SyncSeal';

describe('SyncSeal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    // fetch 永不 resolve → syncing 停在 true
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('同步中顯示朱印 loader', async () => {
    render(<TripStateProvider><SyncSeal /></TripStateProvider>);
    await waitFor(() => expect(screen.getByLabelText('同步中')).toBeTruthy());
    expect(screen.getByLabelText('同步中').className).toContain('seal-loader');
  });
});
