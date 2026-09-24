import '@testing-library/jest-dom/vitest';

// Polyfill do requestAnimationFrame (não implementado nativamente no jsdom).
if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = id => clearTimeout(id);
}
