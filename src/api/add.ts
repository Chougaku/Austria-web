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
  /** 評分 1–5，空字串＝沒評 */
  rating: string;
  /** uploadImage 拿到的檔名；第一張是卡片封面。 */
  images: string[];
}

/** 新增攻略（原始資料/別人行程/<標題>.md）。images 接在內文後面。 */
export interface NewGuideInput { title: string; author: string; url: string; body: string; images: string[] }

type ErrorBody = { error?: string; reason?: string; status?: number; detail?: string };

/** what：「地點」「待辦」「攻略」，用在同名已存在的訊息。 */
export function addErrorMessage(status: number, body: ErrorBody | null, what: string): string {
  if (status === 401) return '登入已失效，請重新登入後再新增';
  if (status === 409) return body?.error === 'sha conflict'
    ? '檔案剛被改過，請再送出一次'
    : `已經有同名的${what}了，換個名稱，或直接到 vault 修改`;
  if (status === 400) return body?.detail ?? '資料格式不對，無法新增';
  if (status === 404) return '找不到這筆資料（可能剛被改名或刪除），等網站更新後再試';
  if (body?.reason === 'github-auth') return 'Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN';
  if (status === 502) return `寫入 vault 失敗（${body?.status ?? '未知狀態'}），請稍後再試`;
  return `新增失敗（HTTP ${status}）`;
}

async function post(path: string, payload: BodyInit, contentType: string, what: string): Promise<{ id: string }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': contentType },
      body: payload,
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

const postJson = (path: string, payload: unknown, what: string) => post(path, JSON.stringify(payload), 'application/json', what);

export const addEntity = (input: NewEntityInput) => postJson('/api/entity', input, '地點');
export const addGuide = (input: NewGuideInput) => postJson('/api/guide', input, '攻略');
export const addTodo = (text: string) => postJson('/api/todo', { text }, '待辦');

/** 編輯餐廳／景點／購物：只送動過的欄位（沒動的不送，免得網站還沒重建時把上一次的修改蓋回去）。
    removeImages 是 vault 裡的寫法（ImageRef.file），addImages 是 uploadImage 拿到的檔名。回傳新的 id（改名時會變）。 */
export interface EntityUpdate {
  id: string;
  changes: Partial<Record<'name' | 'type' | 'city' | 'location' | 'address' | 'ticket' | 'price' | 'summary' | 'rating', string>>;
  removeImages: string[];
  addImages: string[];
}
export const updateEntity = (u: EntityUpdate) => postJson('/api/entity/update', u, '地點');

/** 編輯攻略用的原始內容（從 vault 讀，不是網站上建置過的版本）：images 是內文裡從儀表板上傳的圖。 */
export interface GuideRaw { id: string; author: string; url: string; body: string; images: string[] }

export async function getGuideRaw(id: string): Promise<GuideRaw> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/guide?id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new Error('連不上伺服器，請確認網路後再試');
  }
  if (res.status === 404) throw new Error('找不到這篇（可能剛被改名或刪除），等網站更新後再試');
  if (!res.ok) throw new Error(`讀不到攻略內容（HTTP ${res.status}）`);
  return res.json() as Promise<GuideRaw>;
}

/** 編輯攻略：只送動過的欄位；標題就是檔名，改了會換檔名。 */
export interface GuideUpdate {
  id: string;
  changes: Partial<Record<'title' | 'author' | 'url' | 'body', string>>;
  removeImages: string[];
  addImages: string[];
}
export const updateGuide = (u: GuideUpdate) => postJson('/api/guide/update', u, '攻略');

/** 改一句待辦的文字（勾選狀態照舊）。 */
export const updateTodo = (text: string, next: string) => postJson('/api/todo/update', { text, next }, '待辦');

/** 上傳一張（已縮好的）圖片到 vault 的 assets/，回傳檔名（id）給新增或行程用 `![[檔名]]` 嵌入。
    這一步不會觸發網站重建，要等後面的新增／存檔送出才一起重建。 */
export const uploadImage = (blob: Blob) => post('/api/image', blob, blob.type || 'image/jpeg', '圖片');

/** 刪除：餐廳／景點／購物、攻略（連同它從儀表板上傳的照片），或一句待辦。 */
export type DeleteInput = { kind: 'entity' | 'guide'; id: string } | { kind: 'todo'; text: string };

export function deleteErrorMessage(status: number, body: ErrorBody | null): string {
  if (status === 401) return '登入已失效，請重新登入後再刪除';
  if (status === 409) return '檔案剛被改過，請再按一次刪除';
  if (status === 400) return body?.detail ?? '這個項目不能從網站上刪除';
  if (body?.reason === 'github-auth') return 'Worker 的 GitHub token 已失效或權限不足，需重新設定 GITHUB_TOKEN';
  if (status === 502) return `從 vault 刪除失敗（${body?.status ?? '未知狀態'}），請稍後再試`;
  return `刪除失敗（HTTP ${status}）`;
}

/** vault 裡已經沒有它（404，可能別台裝置剛刪掉）也算刪除成功。網站要等重建才真的看不到。 */
export async function deleteItem(input: DeleteInput): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('刪除逾時，請確認網路後再試');
    throw new Error('連不上伺服器，請確認網路後再試');
  }
  if (res.ok || res.status === 404) return;
  const body = await res.json().catch(() => null) as ErrorBody | null;
  throw new Error(deleteErrorMessage(res.status, body));
}
