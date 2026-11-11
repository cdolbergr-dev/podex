"use client";

import { Camera, Check, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Worker } from "tesseract.js";
import { Artwork } from "@/components/artwork";
import { FavoriteButton } from "@/components/favorite-button";
import { useFavorites } from "@/components/favorites-provider";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { OwnedButton } from "@/components/owned-button";
import { matchScannedCard } from "@/lib/actions";
import { cardHref } from "@/lib/explore-params";
import { cardNumberLabel } from "@/lib/format";
import { parseCollectorNumber } from "@/lib/scan-text";
import type { Card } from "@/types/catalog";

/** Remembers the "add scanned cards to my collection" choice in this browser. */
const AUTO_OWN_KEY = "podex.scanAutoOwn";
/** Attempts without a readable number before offering matches by name alone. */
const NAME_ONLY_AFTER = 8;
/** Card proportions (63 × 88 mm). */
const CARD_RATIO = 63 / 88;
type Band = { top: number; bottom: number; left?: number; right?: number };
/** Where the name and the collector number sit, as fractions of the card's height and width. */
const NAME_BAND: Band = { top: 0, bottom: 0.14 };
const NUMBER_BAND: Band = { top: 0.84, bottom: 1 };
/**
 * Number crops tried in turn: the whole bottom strip, then each half enlarged, since the small
 * print sits bottom left on newer cards and bottom right on older ones.
 */
const NUMBER_CROPS: Band[] = [
  NUMBER_BAND,
  { top: 0.88, bottom: 1, left: 0, right: 0.5 },
  { top: 0.88, bottom: 1, left: 0.5, right: 1 },
];

type Phase = "idle" | "starting" | "scanning" | "picking" | "found" | "error";
type ErrorKind = "unsupported" | "denied" | "failed";

function readAutoOwn(): boolean {
  try {
    return window.localStorage.getItem(AUTO_OWN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAutoOwn(value: boolean) {
  try {
    window.localStorage.setItem(AUTO_OWN_KEY, value ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Copies one band of the framed card from the video into a canvas, enlarged and in
 * high-contrast grayscale (optionally inverted, for light text on dark cards) for OCR.
 */
function captureBand(
  video: HTMLVideoElement,
  frame: HTMLElement,
  band: Band,
  invert: boolean,
): HTMLCanvasElement | null {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return null;
  const view = video.getBoundingClientRect();
  const guide = frame.getBoundingClientRect();
  // The video fills its box with object-fit: cover; map the guide from screen to video pixels.
  const scale = Math.max(view.width / videoWidth, view.height / videoHeight);
  const offsetX = (view.width - videoWidth * scale) / 2;
  const offsetY = (view.height - videoHeight * scale) / 2;
  const left = band.left ?? 0;
  const sx = (guide.left - view.left - offsetX + guide.width * left) / scale;
  const sy = (guide.top - view.top - offsetY + guide.height * band.top) / scale;
  const sw = (guide.width * ((band.right ?? 1) - left)) / scale;
  const sh = (guide.height * (band.bottom - band.top)) / scale;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = Math.max(1, Math.round((1200 * sh) / sw));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  let low = 255;
  let high = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    pixels[index] = gray;
    low = Math.min(low, gray);
    high = Math.max(high, gray);
  }
  const range = Math.max(1, high - low);
  for (let index = 0; index < pixels.length; index += 4) {
    let value = ((pixels[index] - low) * 255) / range;
    if (invert) value = 255 - value;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Camera card scanner. Text is read on the device (Tesseract, downloaded on first use); only the
 * collector number and name it reads go to the server to find the card in the catalog.
 */
export function CardScanner() {
  const { t } = useI18n();
  const { addOwned } = useFavorites();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("failed");
  const [status, setStatus] = useState("");
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [byNameOnly, setByNameOnly] = useState(false);
  const [found, setFound] = useState<Card | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [history, setHistory] = useState<Card[]>([]);
  const [autoOwn, setAutoOwn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Promise<Worker> | null>(null);
  /** Bumped to stop the running scan loop. */
  const runRef = useRef(0);
  const autoOwnRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readAutoOwn();
    autoOwnRef.current = stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is read after hydration
    setAutoOwn(stored);
  }, []);

  useEffect(() => {
    // On phones the result sits below the camera: bring it into view.
    if (phase === "found" || phase === "picking") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  }, [phase]);

  const stopCamera = useCallback(() => {
    runRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      workerRef.current?.then((worker) => worker.terminate()).catch(() => {});
      workerRef.current = null;
    },
    [stopCamera],
  );

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = import("tesseract.js").then(({ createWorker, OEM }) => createWorker("eng", OEM.LSTM_ONLY));
      workerRef.current.catch(() => {
        workerRef.current = null;
      });
    }
    return workerRef.current;
  }, []);

  const confirm = useCallback(
    (card: Card) => {
      setFound(card);
      setCandidates([]);
      setPhase("found");
      setHistory((current) => [card, ...current.filter((item) => item.id !== card.id)].slice(0, 24));
      const added = autoOwnRef.current ? addOwned([card.id]) > 0 : false;
      setJustAdded(added);
      navigator.vibrate?.(40);
    },
    [addOwned],
  );

  const scanLoop = useCallback(async () => {
    const run = ++runRef.current;
    const active = () => runRef.current === run;
    const worker = await getWorker();
    const { PSM } = await import("tesseract.js");
    let misses = 0;
    let lastName = "";

    for (let attempt = 0; active(); attempt += 1) {
      const video = videoRef.current;
      const frame = frameRef.current;
      if (!video || !frame || document.hidden) {
        await wait(300);
        continue;
      }
      setStatus(t.scan.looking);
      // Every other attempt reads inverted, for light text on dark (full-art) cards.
      const invert = attempt % 2 === 1;
      const numberBand = captureBand(video, frame, NUMBER_CROPS[Math.floor(attempt / 2) % NUMBER_CROPS.length], invert);
      if (!numberBand) {
        await wait(200);
        continue;
      }
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: "0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      });
      const numberText = (await worker.recognize(numberBand)).data.text;
      if (!active()) return;
      const scanned = parseCollectorNumber(numberText);

      let nameText = "";
      if (scanned || misses + 1 >= NAME_ONLY_AFTER) {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: "" });
        // Light or dark name text: try the other way round when the first read finds no word.
        for (const inverted of [invert, !invert]) {
          const nameBand = captureBand(video, frame, NAME_BAND, inverted);
          if (!nameBand) break;
          nameText = (await worker.recognize(nameBand)).data.text;
          if (!active()) return;
          if (/[A-Za-z]{3}/.test(nameText)) break;
        }
      }

      if (scanned) {
        setStatus(t.scan.reading(scanned.total ? `${scanned.number}/${scanned.total}` : scanned.number));
        const match = await matchScannedCard({ ...scanned, nameText }).catch(() => null);
        if (!active()) return;
        if (match && match.cards.length > 0) {
          runRef.current += 1;
          if (match.confident) {
            confirm(match.cards[0]);
          } else {
            setByNameOnly(false);
            setCandidates(match.cards);
            setPhase("picking");
          }
          return;
        }
      }

      // No number, or one that fits nothing (most likely misread): after a while, offer the
      // cards that match the name alone.
      misses += 1;
      if (misses >= NAME_ONLY_AFTER && nameText.trim() && nameText !== lastName) {
        lastName = nameText;
        const match = await matchScannedCard({ number: "", nameText }).catch(() => null);
        if (!active()) return;
        if (match && match.cards.length > 0) {
          runRef.current += 1;
          setByNameOnly(true);
          setCandidates(match.cards);
          setPhase("picking");
          return;
        }
      }
      await wait(120);
    }
  }, [confirm, getWorker, t]);

  const resume = useCallback(() => {
    setFound(null);
    setCandidates([]);
    setJustAdded(false);
    setPhase("scanning");
    scanLoop().catch(() => {
      stopCamera();
      setErrorKind("failed");
      setPhase("error");
    });
  }, [scanLoop, stopCamera]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKind("unsupported");
      setPhase("error");
      return;
    }
    setPhase("starting");
    setStatus(t.scan.starting);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setStatus(t.scan.loadingReader);
      await getWorker();
      resume();
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : "";
      setErrorKind(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed");
      setPhase("error");
    }
  }, [getWorker, resume, stopCamera, t]);

  function stop() {
    stopCamera();
    setCandidates([]);
    setFound(null);
    setPhase("idle");
  }

  function toggleAutoOwn(value: boolean) {
    autoOwnRef.current = value;
    setAutoOwn(value);
    writeAutoOwn(value);
  }

  const cameraOn = phase !== "idle" && phase !== "error";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <div>
        <div
          className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-black"
          role="img"
          aria-label={t.scan.frameLabel}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 size-full object-cover transition-opacity ${cameraOn ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute inset-0 flex items-center justify-center p-[7%]">
            <div
              ref={frameRef}
              className="relative h-full max-w-full rounded-[4%/3%] shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)] ring-2 ring-white/80"
              style={{ aspectRatio: CARD_RATIO }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-[6%] rounded-sm border-b-2 border-dashed border-white/60"
                style={{ top: `${NAME_BAND.bottom * 100}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-[6%] rounded-sm border-t-2 border-dashed border-white/60"
                style={{ top: `${NUMBER_BAND.top * 100}%` }}
              />
            </div>
          </div>

          {phase === "idle" || phase === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              {phase === "error" ? (
                <p role="alert" className="max-w-xs text-sm leading-6 text-white">
                  {t.scan[errorKind]}
                </p>
              ) : null}
              {phase === "idle" || errorKind !== "unsupported" ? (
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-5 text-sm font-medium text-foreground"
                >
                  {phase === "error" ? <RotateCcw aria-hidden="true" className="size-4" /> : <Camera aria-hidden="true" className="size-4" />}
                  {phase === "error" ? t.scan.tryAgain : t.scan.start}
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === "starting" || phase === "scanning" ? (
            <p
              aria-live="polite"
              className="absolute inset-x-3 bottom-3 rounded-full bg-black/55 px-4 py-2 text-center text-xs text-white backdrop-blur-sm"
            >
              {status}
            </p>
          ) : null}

          {cameraOn ? (
            <button
              type="button"
              onClick={stop}
              className="absolute top-3 right-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">{t.scan.stop}</span>
            </button>
          ) : null}
        </div>

        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoOwn}
            onChange={(event) => toggleAutoOwn(event.target.checked)}
            className="size-4 accent-[var(--color-owned)]"
          />
          {t.scan.autoOwn}
        </label>
      </div>

      <div ref={resultRef} aria-live="polite" className="scroll-mt-20">
        {phase === "found" && found ? (
          <FoundCard card={found} added={justAdded} onNext={resume} />
        ) : phase === "picking" ? (
          <section aria-labelledby="scan-pick">
            <h2 id="scan-pick" className="text-lg font-medium tracking-tight">
              {byNameOnly ? t.scan.nameOnlyTitle : t.scan.pickTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">{byNameOnly ? t.scan.nameOnlyMessage : t.scan.pickMessage}</p>
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {candidates.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => confirm(card)}
                    aria-label={t.scan.pickCard(card.name, card.set.name, cardNumberLabel(card))}
                    className="block w-full cursor-pointer text-left"
                  >
                    <Artwork src={card.images.small || card.images.large} alt="" sizes="120px" fallback={card.name} />
                    <span className="mt-1.5 block truncate text-xs font-medium">{card.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {card.set.name} · {cardNumberLabel(card)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={resume}
              className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-hover"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {t.scan.noneOfThese}
            </button>
          </section>
        ) : (
          <div className="text-sm leading-6 text-muted">
            <p>{t.scan.hint}</p>
            <ul className="mt-4 grid gap-2">
              {t.scan.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-owned" />
                  {tip}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs">{t.scan.privacy}</p>
          </div>
        )}

        {history.length > 0 ? (
          <section aria-labelledby="scan-history" className="mt-10">
            <h2 id="scan-history" className="text-sm font-medium">
              {t.scan.historyHeading}
            </h2>
            <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {history.map((card) => (
                <li key={card.id}>
                  <LocaleLink href={cardHref(card.id, "/scan")} className="block">
                    <Artwork
                      src={card.images.small || card.images.large}
                      alt={t.card.imageAlt(card.name, card.set.name, card.number)}
                      sizes="96px"
                      fallback={card.name}
                    />
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function FoundCard({ card, added, onNext }: { card: Card; added: boolean; onNext: () => void }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="scan-found" className="flex gap-5">
      <div className="w-32 shrink-0 sm:w-40">
        <Artwork
          src={card.images.small || card.images.large}
          alt={t.card.imageAlt(card.name, card.set.name, card.number)}
          sizes="160px"
          fallback={card.name}
        />
      </div>
      <div className="min-w-0">
        <h2 id="scan-found" className="text-xl font-medium tracking-tight">
          {card.name}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {card.set.name} · {cardNumberLabel(card)}
        </p>
        {added ? <p className="mt-2 text-sm text-owned">{t.scan.added}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <OwnedButton id={card.id} name={card.name} variant="label" />
          <FavoriteButton id={card.id} name={card.name} variant="label" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-4 text-sm text-surface"
          >
            <Camera aria-hidden="true" className="size-4" />
            {t.scan.scanNext}
          </button>
          <LocaleLink
            href={cardHref(card.id, "/scan")}
            className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-hover"
          >
            {t.scan.viewCard}
          </LocaleLink>
        </div>
      </div>
    </section>
  );
}
