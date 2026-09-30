"use client";

import { useEffect, useState } from "react";
import { t, textOf, type Lang } from "@menuz/core";
import { api } from "@/lib/api";

type VenueCard = {
  slug: string;
  name: { he: string; en: string };
  kind: { he: string; en: string };
  address: { he: string; en: string };
  blurb: { he: string; en: string };
  hero: string;
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
    <main dir={lang === "he" ? "rtl" : "ltr"} className="min-h-dvh bg-[#17161c] text-[#f3ead6]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-6 sm:px-5 sm:py-10">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.35em] text-[#2ec4b6]">TABLESIDE</p>
            <h1 className="font-serif text-5xl leading-none sm:text-6xl">MENUZ</h1>
            <p className="mt-2 max-w-md text-sm text-[#c9c1b1] sm:text-base">{copy.pickVenueLead}</p>
          </div>
          <div className="flex rounded-full border border-white/20 bg-black/25 p-0.5" dir="ltr" role="group" aria-label={copy.language}>
            {(["he", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={lang === option}
                className="min-h-11 rounded-full px-3 text-sm font-bold"
                style={{ background: lang === option ? "#ff4d8d" : "transparent", color: lang === option ? "#fff" : "#f3ead6" }}
                onClick={() => setLang(option)}
              >
                {option === "he" ? "עב" : "EN"}
              </button>
            ))}
          </div>
        </header>
        {error ? <p>{copy.loadError}</p> : null}
        <ul className="grid grid-cols-2 gap-3 sm:gap-5">
          {venues.map((venue) => (
            <li key={venue.slug} className="flex flex-col overflow-hidden rounded-[1.35rem] bg-[#121016]/80 shadow-[0_0_18px_rgba(255,77,141,0.25)]">
              <div className="h-44 overflow-hidden sm:h-64" style={{ background: venue.theme.card }}>
                {venue.hero ? <img src={venue.hero} alt="" className="h-full w-full object-cover object-top" /> : null}
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <p className="text-[10px] font-bold tracking-widest text-[#ff4d8d] sm:text-xs">{textOf(venue.kind, lang)}</p>
                <h2 className="font-serif text-lg leading-tight sm:text-2xl">{textOf(venue.name, lang)}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#c9c1b1] sm:text-sm">{textOf(venue.blurb, lang)}</p>
                <p className="mt-1 text-xs text-[#c9c1b1]">{textOf(venue.address, lang)}</p>
                <a
                  href={`/v/${venue.slug}/t/4`}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-[#ff4d8d] px-3 text-sm font-bold text-[#1a0b12]"
                >
                  {copy.openTable}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
