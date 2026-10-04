// 立體地景動畫的幾何（網站底圖 1600×945 座標）。diorama-scene.json 是 scripts/build-diorama-scene.cjs 的產物，
// 換地景圖時重跑腳本產生，不要手改。
import raw from './diorama-scene.json';
import type { Pt } from '../lib/diorama-motion';

export interface SpriteBox { file: string; x: number; y: number; w: number; h: number }

export interface DioramaScene {
  size: [number, number];
  sprites: Record<'train' | 'car' | 'carFar' | 'boat' | 'couple' | 'men', SpriteBox>;
  occluders: Record<'pines' | 'wheelTree', SpriteBox>;
  /** 火車沿鐵軌中心線；moves=false 表示底圖沒挖掉火車（沒有乾淨版可補），就不讓它動。 */
  train: { path: Pt[]; anchor: Pt; wheelbase: number; moves: boolean };
  /** anchor：近處那台（車尾）；farAnchor：遠處那台（側面、景深模糊），開上坡後換它。 */
  car: { path: Pt[]; anchor: Pt; farAnchor: Pt };
  boat: { axis: Pt; amp: number; anchor: Pt };
  walkers: Record<'couple' | 'men', { amp: number; period: number }>;
  wheel: { center: Pt; rx: number; ry: number; rotDeg: number; back: Pt; clipX: number; legs: [Pt, Pt][]; ground: number };
}

export const diorama = raw as unknown as DioramaScene;
