// declare class ResizeObserver {
//   constructor(callback: ResizeObserverCallback);
//   observe(target: Element): void;
//   unobserve(target: Element): void;
//   disconnect(): void;
// }

// type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

declare class ResizeObserver {
  constructor(callback: ResizeObserverCallback);
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

type ResizeObserverCallback = (entries: any, observer: ResizeObserver) => void;
