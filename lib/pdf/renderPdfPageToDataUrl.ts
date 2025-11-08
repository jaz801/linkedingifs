type RenderPdfOptions = {
  data: ArrayBuffer;
  targetWidth: number;
  targetHeight: number;
};

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf');

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');

      if (typeof window !== 'undefined') {
        let workerSrc: string | undefined;

        try {
          const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker?url');
          const workerSrcCandidate =
            typeof workerModule === 'string'
              ? workerModule
              : 'default' in workerModule
                ? workerModule.default
                : undefined;

          workerSrc =
            typeof workerSrcCandidate === 'string'
              ? workerSrcCandidate
              : workerSrcCandidate !== undefined
                ? String(workerSrcCandidate)
                : undefined;
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Falling back to CDN pdf.js worker', error);
          }
        }

        if (!workerSrc) {
          const cdnWorkerSrc =
            process.env.NEXT_PUBLIC_PDFJS_WORKER_SRC ||
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version ?? '4.6.82'}/legacy/build/pdf.worker.min.js`;

          workerSrc = cdnWorkerSrc;
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      }

      return pdfjsLib;
    })();
  }

  return pdfJsModulePromise;
}

export async function renderPdfPageToDataUrl(options: RenderPdfOptions) {
  const { data, targetWidth, targetHeight } = options;
  const pdfjsLib = await loadPdfJs();

  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });

    const safeWidth = Math.max(1, targetWidth);
    const safeHeight = Math.max(1, targetHeight);
    const scale = Math.max(safeWidth / baseViewport.width, safeHeight / baseViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create rendering context for PDF background');
    }

    await page.render({ canvasContext: context, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    page.cleanup();
    return dataUrl;
  } finally {
    pdf.cleanup();
    pdf.destroy();
  }
}


