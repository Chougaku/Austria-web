import { apiBase, getToken } from './state';

const TIMEOUT_MS = 20000;

export type AddableCategory = '景點' | '購物';

/** 新增景點／購物時送給 Worker 的欄位（格式由 Worker 的 worker/src/entity.ts 寫成 vault 的 markdown）。 */
export interface NewEntityInput {
  category: AddableCategory;
  name: string;
  type: string;
  city: string;
  location: string;
  address: string;
  ticket: string;
  summary: string;
}

type ErrorBody = { error?: string; reason?: string; status?: number; detail?: string };

export function entityErrorMessage(status: number, body: ErrorBody | null): string {
  if (status === 401) return '登入已失效，請重新登入後再新增';
  if (status === 409) return '已經有同名的地點了，換個名稱，或直接到 vault 修改那個檔案';
  if (status === 400) return body?.detail ?? '資料格式不對，無法新增';
  if (body?.reason === 'github-auth') return 'Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN';
  if (status === 502) return `寫入 vault 失敗（${body?.status ?? '未知狀態'}），請稍後再試`;
  return `新增失敗（HTTP ${status}）`;
}

/** 請 Worker 在 vault 建新檔；網站要等 vault 觸發的重建跑完才看得到。 */
export async function addEntity(input: NewEntityInput): Promise<{ id: string }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/entity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('送出逾時，請確認網路後再試');
    throw new Error('連不上伺服器，請確認網路後再試');
  }
  const body = await res.json().catch(() => null) as (ErrorBody & { id?: string }) | null;
  if (!res.ok) throw new Error(entityErrorMessage(res.status, body));
  return { id: body?.id ?? '' };
}
