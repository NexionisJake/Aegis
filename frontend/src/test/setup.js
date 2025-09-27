import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock browser APIs
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16)
  return 1
})

global.cancelAnimationFrame = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
}

// Mock WebGL context
const mockWebGLContext = {
  canvas: {},
  drawingBufferWidth: 1024,
  drawingBufferHeight: 768,
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawArrays: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  viewport: vi.fn(),
}

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext
  }
  return null
})

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn(),
  },
  writable: true,
})

// Mock console methods to reduce test noise
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}