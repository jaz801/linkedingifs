import type { RenderGifPayload } from '@/lib/render/schema';

export async function downloadGIF(animationData: RenderGifPayload) {
  const response = await fetch('/api/render-gif', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(animationData),
  });

  if (!response.ok) {
    let message = 'Failed to render GIF.';
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      }
    } catch {
      // ignore parsing failure and bubble generic message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'animation.gif';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

