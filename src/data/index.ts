import type { Entity, Day, TodoItem, Meta, Guide, Overview } from './schema';
import entitiesJson from './entities.json';
import daysJson from './days.json';
import todosJson from './todos.json';
import overviewJson from './overview.json';
import metaJson from './meta.json';
import guidesJson from './guides.json';

// JSON 由 build:data 產生、已過 Zod 驗證；內容少時 TS 推出來的聯集型別對不上，一律經 unknown 轉型。
export const entities = entitiesJson as unknown as Entity[];
export const days = daysJson as unknown as Day[];
export const todos = todosJson as unknown as TodoItem[];
export const overview = overviewJson as unknown as Overview;
export const meta = metaJson as unknown as Meta;
export const guides = guidesJson as unknown as Guide[];

export const byCategory = (cat: Entity['category']) => entities.filter((e) => e.category === cat);
