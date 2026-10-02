import { apiBase, getToken } from './state';

const TIMEOUT_MS = 20000;

type ErrorBody = { error?: string; reason?: string; status?: number; detail?: string };

/** 把 Worker 的錯誤回應翻成看得懂的一句話——按下提交的人要知道是自己該重登、
    還是得去換 Worker 的 GitHub token，光看 502 沒人猜得到。 */
export function itineraryErrorMessage(status: number, body: ErrorBody | null): string {
  if (status === 401) return '登入已失效，請重新登入後再提交';
  if (status === 409) return '檔案已在他處變更，請重新整理後再試';
  if (status === 400) return '行程內容格式不對，無法提交（請回報）';
  if (body?.reason === 'github-auth') return 'Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN';
  if (body?.reason === 'github-missing') return '找不到 vault 裡的每日行程檔，請確認 Worker 的路徑設定';
  if (status === 502) return `寫回 GitHub 失敗（${body?.status ?? '未知狀態'}），請稍後再試`;
  return `提交失敗（HTTP ${status}）`;
}

/** 送整份行程區塊 markdown 給 Worker commit 回 vault。 */
export async function putItinerary(daySectionsMarkdown: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/itinerary`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daySectionsMarkdown }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // fetch 只有在連不上／被 CORS 擋／逾時才會 reject，錯誤物件本身沒有可讀訊息。
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('提交逾時，請確認網路後再試');
    throw new Error('連不上伺服器，請確認網路後再試');
  }
  if (res.ok) return;
  const body = await res.json().catch(() => null) as ErrorBody | null;
  throw new Error(itineraryErrorMessage(res.status, body));
}
