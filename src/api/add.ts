import { apiBase, getToken } from './state';

// 從儀表板新增內容：Worker 寫進 vault（新檔或行程筆記的待辦段落），vault 推上去後網站重建才看得到。
const TIMEOUT_MS = 20000;

export type AddableCategory = '餐廳' | '景點' | '購物';

/** 新增餐廳／景點／購物（Worker 的 worker/src/entity.ts 寫成 vault 的實體 markdown）。 */
export interface NewEntityInput {
  category: AddableCategory;
  name: string;
  type: string;
  city: string;
  location: string;
  address: string;
  /** 景點才有 */
  ticket: string;
  /** 餐廳才有 */
  price: string;
  summary: string;
}

/** 新增攻略（原始資料/別人行程/<標題>.md）。 */
export interface NewGuideInput { title: string; author: string; url: string; body: string }

type ErrorBody = { error?: string; reason?: string; status?: number; detail?: string };

/** what：「地點」「待辦」「攻略」，用在同名已存在的訊息。 */
export function addErrorMessage(status: number, body: ErrorBody | null, what: string): string {
  if (status === 401) return '登入已失效，請重新登入後再新增';
  if (status === 409) return body?.error === 'sha conflict'
    ? '檔案剛被改過，請再按一次新增'
    : `已經有同名的${what}了，換個名稱，或直接到 vault 修改`;
  if (status === 400) return body?.detail ?? '資料格式不對，無法新增';
  if (body?.reason === 'github-auth') return 'Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN';
  if (status === 502) return `寫入 vault 失敗（${body?.status ?? '未知狀態'}），請稍後再試`;
  return `新增失敗（HTTP ${status}）`;
}

async function post(path: string, payload: unknown, what: string): Promise<{ id: string }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // fetch 只有在連不上／被 CORS 擋／逾時才會 reject，錯誤物件本身沒有可讀訊息。
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('送出逾時，請確認網路後再試');
    throw new Error('連不上伺服器，請確認網路後再試');
  }
  const body = await res.json().catch(() => null) as (ErrorBody & { id?: string }) | null;
  if (!res.ok) throw new Error(addErrorMessage(res.status, body, what));
  return { id: body?.id ?? '' };
}

export const addEntity = (input: NewEntityInput) => post('/api/entity', input, '地點');
export const addGuide = (input: NewGuideInput) => post('/api/guide', input, '攻略');
export const addTodo = (text: string) => post('/api/todo', { text }, '待辦');
