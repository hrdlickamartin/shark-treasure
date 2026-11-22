import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (dt: number) => void, running: boolean) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      cb.current(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
