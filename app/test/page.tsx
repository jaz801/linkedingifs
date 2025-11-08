'use client';

// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// There was no deterministic frontend fixture combining a PNG background with animated overlays for exercising the render pipeline.
// 🤔 WHY IT HAD TO BE CHANGED:
// Backend export tests require a consistent scene to validate GIF generation without relying on user-generated artwork.
// ✅ WHY THIS SOLUTION WAS PICKED:
// This lightweight SVG animation embeds a black PNG via data URL and layers three colored guide lines with animated circles to keep the test deterministic and portable.

const BLACK_BACKGROUND_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9p6We8wAAAAASUVORK5CYII=';

const LINE_COLORS = ['#22C55E', '#3B82F6', '#FACC15'] as const;
const BALL_COLORS = ['#A3A3A3', '#FFFFFF', '#EC4899'] as const;

const LINE_OFFSETS = [80, 200, 320] as const;

export default function TestFrontendFixture() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 p-8 text-white">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Backend Render Fixture</h1>
          <p className="text-sm text-stone-300">
            Static black PNG background with three animated guide lines and moving circles.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900 p-4 shadow-lg">
          <svg viewBox="0 0 640 400" role="img" className="h-full w-full">
            <image
              href={BLACK_BACKGROUND_PNG}
              width="640"
              height="400"
              preserveAspectRatio="none"
            />

            {LINE_COLORS.map((color, index) => {
              const y = LINE_OFFSETS[index];
              const ballColor = BALL_COLORS[index];
              return (
                <g key={color}>
                  <line x1="60" x2="580" y1={y} y2={y} stroke={color} strokeWidth="6" strokeLinecap="round" />
                  <circle cx="60" cy={y} r="12" fill={ballColor}>
                    <animate
                      attributeName="cx"
                      values="60;580;60"
                      dur="2.4s"
                      repeatCount="indefinite"
                      begin={`${index * 0.4}s`}
                    />
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        <footer className="text-center text-xs text-stone-500">
          Use this page to verify PNG + animation payloads before invoking backend GIF generation.
        </footer>
      </div>
    </div>
  );
}


