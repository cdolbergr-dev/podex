"use client";

import Image from "next/image";
import { useState } from "react";

export function SetMark({
  src,
  alt,
  className,
  sizes = "120px",
  align = "left",
}: {
  src: string;
  alt: string;
  className: string;
  sizes?: string;
  align?: "left" | "center";
}) {
  const [failed, setFailed] = useState(src.length === 0);
  if (failed) return null;

  return (
    <span className={`relative block ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-contain ${align === "center" ? "object-center" : "object-left"}`}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
