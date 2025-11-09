/* eslint-disable @typescript-eslint/no-require-imports */
const PureImage = require('pureimage');

function createCanvas(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError('Canvas width and height must be finite numbers');
  }
  const canvas = PureImage.make(Math.max(0, Math.floor(width)), Math.max(0, Math.floor(height)));
  return {
    width: canvas.width,
    height: canvas.height,
    getContext(type) {
      if (type !== '2d') {
        throw new Error(`Unsupported context type: ${String(type)}`);
      }
      return canvas.getContext('2d');
    },
    getImageData(x, y, w, h) {
      const context = canvas.getContext('2d');
      return context.getImageData(x, y, w, h);
    },
    toBuffer(mimeType) {
      if (mimeType && mimeType !== 'image/png') {
        throw new Error(`Only PNG export is supported. Received ${mimeType}`);
      }
      return PureImage.encodePNGToBuffer(canvas);
    },
    _image: canvas,
  };
}

async function loadImage(source) {
  const buffer = await toPngBuffer(source);
  const image = await PureImage.decodePNGFromBuffer(buffer);
  return image;
}

async function toPngBuffer(source) {
  if (!source) {
    throw new TypeError('Cannot load image from empty source');
  }

  if (Buffer.isBuffer(source)) {
    return source;
  }

  if (source instanceof ArrayBuffer) {
    return Buffer.from(source);
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const match = source.match(/^data:image\/png;base64,(.*)$/);
      if (!match) {
        throw new Error('Only base64 encoded PNG data URLs are supported.');
      }
      return Buffer.from(match[1], 'base64');
    }
    throw new Error('Loading images from filesystem paths is disabled in this environment.');
  }

  if (source instanceof URL) {
    if (source.protocol === 'data:') {
      return toPngBuffer(source.toString());
    }
    throw new Error('Loading remote images is disabled in this environment.');
  }

  if (typeof source === 'object' && source.data && source.mimeType) {
    if (source.mimeType !== 'image/png') {
      throw new Error(`Unsupported image mime type: ${source.mimeType}`);
    }
    return Buffer.isBuffer(source.data) ? source.data : Buffer.from(source.data);
  }

  throw new Error('Unsupported image source type');
}

module.exports = {
  createCanvas,
  loadImage,
};

