import { Suspense } from "react";
import { CardModalInstantShell } from "@/components/card-modal-instant-shell";
import { CardModalPage } from "@/components/card-modal-page";
import { CardModalRouteGate } from "@/components/card-modal-route-gate";

export default function InterceptedCardPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CardModalRouteGate>
      <Suspense fallback={<CardModalInstantShell />}>
        <CardModalPage {...props} />
      </Suspense>
    </CardModalRouteGate>
  );
}
