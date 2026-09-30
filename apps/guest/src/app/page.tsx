"use client";

import { useEffect, useState } from "react";
import { t, textOf, type Lang } from "@menuz/core";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type VenueCard = {
  slug: string;
  name: { he: string; en: string };
  kind: { he: string; en: string };
  address: { he: string; en: string };
  theme: { bg: string; ink: string; muted: string; accent: string; accentInk: string; card: string };
};

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("he");
  const [venues, setVenues] = useState<VenueCard[]>([]);
  const [error, setError] = useState(false);
  const copy = t(lang);

  useEffect(() => {
    const stored = window.localStorage.getItem("menuz-lang");
    if (stored === "en" || stored === "he") setLang(stored);
    api<{ venues: VenueCard[] }>("/venues")
      .then((result) => setVenues(result.venues))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    window.localStorage.setItem("menuz-lang", lang);
  }, [lang]);

  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="min-h-dvh bg-[#14120f] text-[#f6efe6]">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 py-8">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#cbbba8]">{copy.brand}</p>
            <h1 className="font-serif text-4xl leading-none">{copy.pickVenue}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#cbbba8]">{copy.pickVenueLead}</p>
          </div>
          <Button variant="outline" className="h-12" onClick={() => setLang(lang === "he" ? "en" : "he")}>
            {lang === "he" ? "EN" : "עב"}
          </Button>
        </header>
        {error ? <p>{copy.loadError}</p> : null}
        <ul className="space-y-3">
          {venues.map((venue) => (
            <li key={venue.slug} className="rounded-3xl p-4" style={{ background: venue.theme.card, color: venue.theme.ink }}>
              <p className="text-xs" style={{ color: venue.theme.muted }}>{textOf(venue.kind, lang)}</p>
              <h2 className="font-serif text-3xl">{textOf(venue.name, lang)}</h2>
              <p className="mt-1 text-sm" style={{ color: venue.theme.muted }}>{textOf(venue.address, lang)}</p>
              <a
                href={`/v/${venue.slug}/t/4`}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold"
                style={{ background: venue.theme.accent, color: venue.theme.accentInk }}
              >
                {copy.openTable}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
