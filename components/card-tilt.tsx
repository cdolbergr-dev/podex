"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/card-transition";

const MAX_TILT_X = 8;
const MAX_TILT_Y = 10;

/** Pointer-following 3D tilt + light sheen for the opened card (styles in globals.css). */
export function CardTilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    // Touch drags scroll the modal; only fine pointers tilt.
    if (event.pointerType === "touch" || prefersReducedMotion()) return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.dataset.tilting = "";
      node.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * MAX_TILT_X).toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * MAX_TILT_Y).toFixed(2)}deg`);
      node.style.setProperty("--sheen-x", `${(x * 100).toFixed(1)}%`);
      node.style.setProperty("--sheen-y", `${(y * 100).toFixed(1)}%`);
    });
  }

  function onPointerLeave() {
    const node = ref.current;
    if (!node) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    delete node.dataset.tilting;
    node.style.removeProperty("--tilt-x");
    node.style.removeProperty("--tilt-y");
  }

  return (
    <div ref={ref} className="card-tilt" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="card-tilt-inner">{children}</div>
    </div>
  );
}
