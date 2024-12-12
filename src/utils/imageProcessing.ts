import type { CMYKChannel, CMYKConfig } from '../types';
import { CMYK_CONFIG } from '../constants/halftone';

interface ProcessedImage {
  data: Uint8Array;
  width: number;
  height: number;
}

function createCanvas(
  width: number,
  height: number
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function quantizeValue(value: number, steps = 5): number {
  const mappedValue = 0.1 + value * 0.9;
  const step = 0.9 / (steps - 1);
  return Math.round(mappedValue / step) * step;
}

function processImageData(
  imageData: ImageData,
  saturation: number,
  contrast: number
): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    for (let j = 0; j < 3; j++) {
      data[i + j] = avg + (data[i + j] - avg) * saturation;
      data[i + j] = (data[i + j] - 128) * contrast + 128;
    }
  }
}

function getChannelValue(
  channel: CMYKChannel,
  srcData: Uint8ClampedArray,
  pixelIndex: number,
  minValues: Record<CMYKChannel, number>
): number {
  let value: number;
  const r = srcData[pixelIndex];
  const g = srcData[pixelIndex + 1];
  const b = srcData[pixelIndex + 2];

  switch (channel) {
    case 'c':
      value = 255 - srcData[pixelIndex];
      break;
    case 'm':
      value = 255 - srcData[pixelIndex + 1];
      break;
    case 'y':
      value = 255 - srcData[pixelIndex + 2];
      break;
    case 'k':
      value = 255 - Math.max(r, g, b);
      break;
  }
  return Math.min(255, Math.max(minValues[channel], value * 1.15));
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dotSize: number,
  opacity: number,
  size: number
): void {
  const sizeVariation = (Math.random() * 0.2 + 0.9) * dotSize;
  const posVariation = (Math.random() - 0.5) * (size * 0.35);

  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(
    x + posVariation,
    y + posVariation,
    sizeVariation / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.globalAlpha = 1;
}

export async function processImage(
  imageData: Uint8Array,
  width: number,
  height: number,
  options: {
    size: number;
    angle: number;
    saturation: number;
    contrast: number;
    patternType: 'dots' | 'halftones';
  }
): Promise<ProcessedImage> {
  return halftoneImage(imageData, width, height, options);
}

async function halftoneImage(
  imageData: Uint8Array,
  width: number,
  height: number,
  options: {
    size: number;
    angle: number;
    saturation: number;
    contrast: number;
  }
): Promise<ProcessedImage> {
  const [sourceCanvas, ctxSource] = createCanvas(width, height);

  // Create and draw original image
  const blob = new Blob([imageData], { type: 'image/png' });
  const imageBitmap = await createImageBitmap(blob);
  ctxSource.drawImage(imageBitmap, 0, 0);

  // Process source image
  const sourceImageData = ctxSource.getImageData(0, 0, width, height);
  processImageData(sourceImageData, options.saturation, options.contrast);
  ctxSource.putImageData(sourceImageData, 0, 0);

  // Create final canvas
  const [canvas, ctx] = createCanvas(width, height);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Create CMYK config with base angle
  const cmykConfig: CMYKConfig = {
    ...CMYK_CONFIG,
    angles: {
      c: options.angle + CMYK_CONFIG.angles.c,
      m: options.angle + CMYK_CONFIG.angles.m,
      y: options.angle + CMYK_CONFIG.angles.y,
      k: options.angle + CMYK_CONFIG.angles.k,
    },
  };

  // Process each CMYK channel
  Object.entries(cmykConfig.colors).forEach(([channel, color]) => {
    const [layerCanvas, ctxLayer] = createCanvas(width, height);
    const angleRad =
      (cmykConfig.angles[channel as CMYKChannel] * Math.PI) / 180;

    const stepX = options.size * Math.cos(angleRad);
    const stepY = options.size * Math.sin(angleRad);
    const diagonal = Math.sqrt(width * width + height * height);
    const numSteps = Math.ceil(diagonal / options.size);

    ctxLayer.fillStyle = color;
    for (let i = -numSteps; i <= numSteps; i++) {
      for (let j = -numSteps; j <= numSteps; j++) {
        const x = width / 2 + (i * stepX - j * stepY);
        const y = height / 2 + (i * stepY + j * stepX);

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
        const channelValue = getChannelValue(
          channel as CMYKChannel,
          sourceImageData.data,
          pixelIndex,
          cmykConfig.minValues
        );
        const t = channelValue / 255;
        const dotSize = options.size * (0.8 * Math.max(0.4, t) + t * 0.2);

        drawDot(ctxLayer, x, y, dotSize, quantizeValue(t), options.size);
      }
    }

    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  });

  const processedBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  );
  const processedData = new Uint8Array(await processedBlob.arrayBuffer());

  return { data: processedData, width, height };
}
