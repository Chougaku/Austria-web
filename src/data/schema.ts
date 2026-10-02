import { z } from 'zod';

export const CATEGORIES = ['餐廳', '景點', '購物', '交通', '住宿', '區域'] as const;

export const EntitySchema = z.object({
  id: z.string().min(1),
  category: z.enum(CATEGORIES),
  name: z.string().min(1),
  tags: z.array(z.string()),
  updated: z.string(),
  favorite: z.boolean(),
  fields: z.record(z.string(), z.string()),
  summary: z.string(),
  body: z.string(),
  area: z.string(),
  rating: z.number().min(0).max(5).nullable(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const DaySlotSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  note: z.string(),
  pending: z.boolean(),
});
export const DaySchema = z.object({
  label: z.string().regex(/^Day \d+$/),
  date: z.string().min(1),
  theme: z.string().min(1),
  areas: z.array(z.string()),
  slots: z.array(DaySlotSchema).min(1),
});
export type Day = z.infer<typeof DaySchema>;
export type DaySlot = z.infer<typeof DaySlotSchema>;

export const TodoItemSchema = z.object({
  key: z.string().startsWith('todo:'),
  text: z.string().min(1),
  checkedInVault: z.boolean(),
});
export type TodoItem = z.infer<typeof TodoItemSchema>;

export const GuideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string(),
  sourceUrl: z.string(),
  body: z.string().min(1),
});
export type Guide = z.infer<typeof GuideSchema>;

/** 一段住宿（總覽.md 的 `## 住宿`）。夜數由入住／退房日算出。 */
export const StaySchema = z.object({
  city: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().int().min(1),
  hotel: z.string(),
  booked: z.boolean(),
  parking: z.string(),
  note: z.string(),
});
export type Stay = z.infer<typeof StaySchema>;

export const LEG_MODES = ['flight', 'drive', 'train', 'bus', 'ferry', 'other'] as const;
export type LegMode = (typeof LEG_MODES)[number];

/** 城市間的移動（總覽.md 的 `## 移動`）。 */
export const LegSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(LEG_MODES),
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string(),
});
export type Leg = z.infer<typeof LegSchema>;

/** 要訂的東西（總覽.md 的 `## 預訂`）：機票、租車、火車票…… */
export const BookingSchema = z.object({
  item: z.string().min(1),
  status: z.string(),
  done: z.boolean(),
  detail: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const OverviewSchema = z.object({
  fields: z.record(z.string(), z.string()),
  stays: z.array(StaySchema),
  legs: z.array(LegSchema),
  bookings: z.array(BookingSchema),
  transportNotes: z.array(z.string()),
});
export type Overview = z.infer<typeof OverviewSchema>;

export const MetaSchema = z.object({
  builtAt: z.string(),
  tripStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tripEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Meta = z.infer<typeof MetaSchema>;