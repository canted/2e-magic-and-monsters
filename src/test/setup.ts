import "@testing-library/jest-dom/vitest";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  value: TestResizeObserver,
  writable: true
});

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  value: () => {},
  writable: true
});
