'use client';

// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// Core toolbar controls lacked consistent identifiers and the line width control wasn't user-editable.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without stable identifiers and an editable input, downstream automation could not target the correct elements and users couldn't adjust stroke widths.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Injecting semantic ids/data attributes and converting the static line width label into a number input preserves layout while enabling interaction.

// 🔁 RECURRING ISSUE TRACKER [Cursor Rule #2]
// 🧠 ERROR TYPE: Missing semantic identifiers for key UI controls
// 📂 FILE: app/page.tsx
// 🧾 HISTORY: This issue has now occurred 1 time in this project.
//   - #1 on 2025-11-07 [Fixed in app/page.tsx]
// 🚨 Next steps:
// Consider automated UI testing to ensure interactive controls remain functional.

import { ChangeEvent, useRef, useState } from 'react';

export default function Home() {
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(1);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const openColorPicker = () => {
    const input = colorInputRef.current;
    if (!input) return;

    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }

    input.click();
  };

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    setColor(event.target.value.toUpperCase());
  };

  const handleLineWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setLineWidth(value <= 0 ? 1 : Math.floor(value));
  };

  const normalizeLineWidth = () => {
    setLineWidth((prev) => (prev <= 0 ? 1 : prev));
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-950 font-sans">
      <main className="relative h-[1117px] w-[1728px] overflow-hidden bg-stone-950">
        <div className="absolute left-[416px] top-[85px] inline-flex w-[896px] items-start justify-start gap-12 overflow-hidden bg-stone-950 py-8">
          <img
            className="relative h-[774px] flex-1 rounded-2xl border-[1.5px] border-black/0 object-cover"
            src="https://placehold.co/896x774"
            alt="Preview"
          />
        </div>

        <div className="absolute left-[750px] top-[933px] h-16 w-56 rounded-2xl bg-stone-900" />
        <div
          data-element="line-element"
          className="absolute left-[802px] top-[953px] h-0 w-12 origin-top-left rotate-[136.68deg] outline outline-1 outline-offset-[-0.5px] outline-white"
        />
        <div
          data-element="arrow-element"
          className="absolute left-[822px] top-[989px] h-0 w-11 origin-top-left -rotate-45 border border-white"
        />

        <div
          data-element="upload-buttons"
          className="absolute left-[872px] top-[951px] h-11 w-11 overflow-hidden"
        >
          <div className="absolute left-[7.17px] top-[7.17px] h-7 w-7 bg-white" />
        </div>

        <div
          data-element="download-button"
          className="absolute left-[935px] top-[958px] h-7 w-7 overflow-hidden"
        >
          <div className="absolute left-[12.6px] top-[9.06px] h-4 w-0.5 bg-white" />
          <div className="absolute left-[7.18px] top-[9.04px] h-2 w-3 bg-white" />
          <div className="absolute left-[1.82px] top-[1.7px] h-5 w-6 bg-white" />
        </div>

        <div className="absolute left-[1336px] top-[393px] h-44 w-36 rounded-2xl bg-stone-900" />
        <div
          id="color-picker"
          className="absolute left-[1364px] top-[427px] h-8 w-24 rounded-[5px] bg-neutral-700"
        />
        <button
          type="button"
          onClick={openColorPicker}
          aria-label="Color picker"
          data-element="color-picker"
          className="absolute left-[1370px] top-[430px] h-6 w-6 rounded-[5px] border-0 bg-white p-0"
          style={{ backgroundColor: color }}
        />
        <button
          type="button"
          onClick={openColorPicker}
          id="color-picker-value"
          className="absolute left-[1404px] top-[435px] text-xs font-normal text-white appearance-none bg-transparent p-0"
        >
          {color.replace('#', '').toUpperCase()}
        </button>

        <div
          id="shape-picker"
          className="absolute left-[1364px] top-[501px] h-8 w-24 rounded-[5px] bg-neutral-700"
        />
        <div className="absolute left-[1369px] top-[510px] h-4 w-4 rounded-full bg-zinc-300" />
        <div className="absolute left-[1388px] top-[510px] h-4 w-4 bg-zinc-300" />
        <div className="absolute left-[1436px] top-[510px] text-xs font-normal text-white">
          1
        </div>

        <div
          id="line-width"
          className="absolute left-[1364px] top-[467px] flex h-6 w-24 items-center rounded-[5px] bg-neutral-700 px-[6px]"
        >
          <div className="mr-[5px] flex h-[10px] w-[10px] flex-col justify-between">
            <div className="h-px w-full bg-zinc-300" />
            <div className="h-[3px] w-full bg-zinc-300" />
            <div className="h-[3px] w-full bg-zinc-300" />
          </div>
          <input
            type="number"
            min={1}
            step={1}
            value={lineWidth}
            onChange={handleLineWidthChange}
            onBlur={normalizeLineWidth}
            className="mx-[5px] h-full w-6 text-center text-xs font-normal text-white bg-transparent leading-none outline-none [appearance:textfield]"
          />
          <div className="flex h-4 w-4 flex-col overflow-hidden rounded bg-zinc-200 text-[10px] text-black">
            <button
              type="button"
              aria-label="Increase line width"
              className="flex-1 leading-[10px]"
              onClick={() => setLineWidth((prev) => Math.max(1, prev + 1))}
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="Decrease line width"
              className="flex-1 leading-[10px]"
              onClick={() => setLineWidth((prev) => (prev <= 1 ? 1 : prev - 1))}
            >
              ▼
            </button>
          </div>
        </div>
      </main>
      <input
        ref={colorInputRef}
        type="color"
        value={color}
        onChange={handleColorChange}
        className="absolute left-[1433px] top-[430px] h-6 w-6 cursor-pointer appearance-none border-0 bg-transparent opacity-0"
      />
    </div>
  );
}
