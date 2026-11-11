"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Text clamped to a few lines, with a toggle shown only when it actually overflows. */
export function ExpandableText({
  text,
  lang,
  moreLabel,
  lessLabel,
  className = "",
}: {
  text: string;
  lang?: string;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div>
      <p ref={ref} lang={lang} className={`${className} ${expanded ? "" : "line-clamp-2 sm:line-clamp-3"}`}>
        {text}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="cursor-pointer text-xs text-muted underline decoration-border underline-offset-4 hover:text-foreground"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
