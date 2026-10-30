// Anchor server epoch time to a monotonic clock so changing the device's
// wall clock during a game cannot move the countdown.
let serverAnchor = Date.now();
let localAnchor = performance.now();
let synchronized = false;
const listeners = new Set<() => void>();

export function serverNow(): number {
  return serverAnchor + performance.now() - localAnchor;
}

export function isClockSynchronized(): boolean {
  return synchronized;
}

export function updateServerClock(serverTime: number, sentAt: number, receivedAt: number): void {
  serverAnchor = serverTime + (receivedAt - sentAt) / 2;
  localAnchor = receivedAt;
  synchronized = true;
  listeners.forEach((listener) => listener());
}

export function subscribeServerClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
