// jsdom 尚未實作 AnimationEvent；React 偵測不到會改聽 webkitAnimationEnd，
// 導致測試裡 fireEvent.animationEnd 打不進 onAnimationEnd。補上最小 polyfill。
if (typeof window !== 'undefined' && typeof (globalThis as Record<string, unknown>).AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;
    constructor(type: string, init: (EventInit & { animationName?: string; elapsedTime?: number; pseudoElement?: string }) = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  (globalThis as Record<string, unknown>).AnimationEvent = AnimationEventPolyfill;
  (window as unknown as Record<string, unknown>).AnimationEvent = AnimationEventPolyfill;
}
