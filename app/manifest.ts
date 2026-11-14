import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f0ea",
    theme_color: "#f3f0ea",
    categories: ["entertainment", "games", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon to jump straight in. One manifest serves every language,
    // so these open the English pages.
    shortcuts: [
      { name: "Scan a card", short_name: "Scan", url: "/scan" },
      { name: "My collection", short_name: "Collection", url: "/collection" },
      { name: "Favorites", short_name: "Favorites", url: "/favorites" },
      { name: "Browse sets", short_name: "Sets", url: "/sets" },
    ],
    // Shown in the richer install sheet on Android and desktop Chrome (npm run build:screenshots).
    screenshots: [
      { src: "/screenshots/home-narrow.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Search every Pokémon card" },
      { src: "/screenshots/card-narrow.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Card details and prices" },
      { src: "/screenshots/set-narrow.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Every card in every set" },
      { src: "/screenshots/home-wide.png", sizes: "1920x1080", type: "image/png", form_factor: "wide", label: "Podex on desktop" },
    ],
  };
}
