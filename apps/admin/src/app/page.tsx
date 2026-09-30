"use client";

import { FormEvent, useEffect, useState } from "react";
import { textOf, type Lang } from "@menuz/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken, setToken } from "@/lib/api";

type VenueCard = {
  slug: string;
  name: { he: string; en: string };
  kind: { he: string; en: string };
  address: { he: string; en: string };
  version: number;
};

export default function AdminHome() {
  const [lang, setLang] = useState<Lang>("he");
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [venues, setVenues] = useState<VenueCard[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("menuz-lang");
    if (stored === "en" || stored === "he") setLang(stored);
    const signedIn = Boolean(getToken());
    setAuthed(signedIn);
    setReady(true);
    if (signedIn) {
      api<{ venues: VenueCard[] }>("/venues").then((result) => setVenues(result.venues)).catch(() => setError("load"));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ token: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(result.token);
      setAuthed(true);
      const list = await api<{ venues: VenueCard[] }>("/venues");
      setVenues(list.venues);
    } catch {
      setError(lang === "he" ? "הסיסמה לא נכונה." : "That password is wrong.");
    }
  }

  const guestOrigin = process.env.NEXT_PUBLIC_GUEST_ORIGIN || "http://127.0.0.1:43123";

  if (!ready) return <main className="min-h-dvh bg-[#14120f]" />;

  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="min-h-dvh bg-[#14120f] text-[#f6efe6]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#cbbba8]">Menuz</p>
            <h1 className="font-serif text-4xl">{lang === "he" ? "ניהול" : "Admin"}</h1>
          </div>
          <Button variant="outline" className="h-12" onClick={() => setLang(lang === "he" ? "en" : "he")}>
            {lang === "he" ? "EN" : "עב"}
          </Button>
        </header>

        {!authed ? (
          <form onSubmit={login} className="max-w-sm space-y-3 rounded-3xl bg-[#241c16] p-5">
            <label className="block text-sm text-[#cbbba8]">
              {lang === "he" ? "סיסמת צוות" : "Staff password"}
              <Input className="mt-1 h-12" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </label>
            {error ? <p className="text-sm">{error}</p> : null}
            <Button className="h-12 w-full" type="submit">{lang === "he" ? "כניסה" : "Sign in"}</Button>
            <p className="text-xs text-[#cbbba8]">{lang === "he" ? "ברירת המחדל המקומית: tableside" : "Local default: tableside"}</p>
          </form>
        ) : (
          <>
            <div className="flex gap-2">
              <a href="/staff" className="inline-flex h-12 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">{lang === "he" ? "לוח הזמנות" : "Order board"}</a>
            </div>
            <ul className="grid gap-3">
              {venues.map((venue) => (
                <li key={venue.slug} className="rounded-3xl bg-[#241c16] p-4">
                  <p className="text-xs text-[#cbbba8]">{textOf(venue.kind, lang)} · v{venue.version}</p>
                  <h2 className="font-serif text-3xl">{textOf(venue.name, lang)}</h2>
                  <p className="text-sm text-[#cbbba8]">{textOf(venue.address, lang)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={`/venues/${venue.slug}`} className="inline-flex h-12 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">{lang === "he" ? "עריכה ופרסום" : "Edit and publish"}</a>
                    <a href={`${guestOrigin}/v/${venue.slug}/t/4`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-4 font-medium">{lang === "he" ? "תפריט אורח" : "Guest menu"}</a>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
