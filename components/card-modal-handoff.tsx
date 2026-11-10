"use client";

import { useLayoutEffect } from "react";
import { useCardOpen } from "@/components/card-open-context";

/** Route modal is active — drop any preflight shell so only one modal owns the card art. */
export function CardModalHandoff() {
  const { endCardOpen } = useCardOpen();

  useLayoutEffect(() => {
    endCardOpen();
  }, [endCardOpen]);

  return null;
}
