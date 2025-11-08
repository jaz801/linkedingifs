'use client';

export function FooterActions() {
  return (
    <footer className="border-t border-white/10 bg-stone-900/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
          <div>
            <p className="text-sm font-semibold text-white">Ready to export?</p>
            <p className="text-xs text-white/60">Save to your GIF library or download locally.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Upload
          </button>
          <button
            type="button"
            className="rounded-2xl border border-white bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-lg shadow-white/50 transition hover:translate-y-[-1px] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Download
          </button>
        </div>
      </div>
    </footer>
  );
}

