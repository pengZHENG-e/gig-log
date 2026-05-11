"use client";

import { useEffect, useState } from "react";

export interface ArtistMeta {
  name: string;
  photo?: string;
  photoSmall?: string;
  genres: string[];
  summary?: string;
  wiki?: string;
  mbid?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  type?: string;
  source?: string;
}

let cache: Record<string, ArtistMeta> | null = null;
let pending: Promise<Record<string, ArtistMeta>> | null = null;

async function load(): Promise<Record<string, ArtistMeta>> {
  if (cache) return cache;
  if (pending) return pending;
  // no-cache: always revalidate with origin (sends If-Modified-Since, gets 304 when unchanged).
  // The previous force-cache value pinned old artists.json on every browser that loaded it.
  pending = fetch("/artists.json", { cache: "no-cache" })
    .then(r => (r.ok ? r.json() : {}))
    .then(d => (cache = d as Record<string, ArtistMeta>))
    .catch(() => (cache = {}));
  return pending;
}

export function useArtistMeta(name: string | undefined): ArtistMeta | undefined {
  const [meta, setMeta] = useState<ArtistMeta | undefined>(() =>
    name && cache ? cache[name] : undefined
  );
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    load().then(d => { if (!cancelled) setMeta(d[name]); });
    return () => { cancelled = true; };
  }, [name]);
  return meta;
}
