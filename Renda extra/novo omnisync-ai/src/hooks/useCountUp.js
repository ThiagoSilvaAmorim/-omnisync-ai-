import { useEffect, useState } from 'react';

// ============================================
// useCountUp — anima um número de 0 até o alvo
// com easing suave (ease-out cúbico). Usado em
// KPIs para dar sensação de dado "vivo".
// ============================================
export function useCountUp(target, duration = 500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
