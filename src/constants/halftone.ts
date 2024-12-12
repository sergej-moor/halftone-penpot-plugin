export const HALFTONE_CONSTANTS = {
  DEFAULT_SIZE: 5,
  MIN_SIZE: 2,
  MAX_SIZE: 32,
  DEFAULT_ANGLE: 34,
  MIN_ANGLE: 0,
  MAX_ANGLE: 360,
  DEFAULT_SATURATION: 1.3,
  MIN_SATURATION: 0.5,
  MAX_SATURATION: 3,
  DEFAULT_CONTRAST: 1.0,
  MIN_CONTRAST: 0.5,
  MAX_CONTRAST: 2,
} as const;

export const CMYK_CONFIG = {
  angles: {
    c: 15,
    m: 75,
    y: 0,
    k: 45,
  },
  colors: {
    c: 'rgba(0, 255, 255, 0.95)',
    m: 'rgba(255, 0, 255, 0.95)',
    y: 'rgba(255, 255, 0, 0.95)',
    k: 'rgba(0, 0, 0, 0.95)',
  },
  minValues: {
    c: 35,
    m: 30,
    y: 40,
    k: 10,
  },
} as const;
