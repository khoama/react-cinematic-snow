import '@testing-library/jest-dom';

declare var global: any;
declare var jest: any;

// Polyfill RequestAnimationFrame for the testing environment
global.requestAnimationFrame = (callback: any) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id: any) => clearTimeout(id);

// Mock HTML5 Canvas API since JSDOM does not implement drawing context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    clearRect: jest.fn(),
    fillStyle: '',
    globalAlpha: 1,
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
  }),
});