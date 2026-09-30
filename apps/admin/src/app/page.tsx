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
  const [creating, setCreating] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [form, setForm] = useState({ nameHe: "", nameEn: "", addressHe: "", addressEn: "", kindHe: "", kindEn: "", tableCount: "8" });

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

  function applyTemplate(slug: string) {
    setCopyFrom(slug);
    const venue = venues.find((entry) => entry.slug === slug);
    if (!venue) return;
    setForm({
      nameHe: venue.name.he,
      nameEn: venue.name.en,
      addressHe: venue.address.he,
      addressEn: venue.address.en,
      kindHe: venue.kind.he,
      kindEn: venue.kind.en,
      tableCount: form.tableCount || "8",
    });
  }

  async function createVenue(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ draft: { venue: { slug: string } } }>("/admin/venues", {
        method: "POST",
        body: JSON.stringify({
          nameHe: form.nameHe,
          nameEn: form.nameEn,
          addressHe: form.addressHe,
          addressEn: form.addressEn,
          kindHe: form.kindHe,
          kindEn: form.kindEn,
          tableCount: Number(form.tableCount),
          copyFrom,
        }),
      });
      window.location.href = `/venues/${result.draft.venue.slug}`;
    } catch {
      setError(lang === "he" ? "לא הצלחנו ליצור את העסק." : "The business could not be created.");
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
            <div className="flex flex-wrap gap-2">
              <a href="/staff" className="inline-flex h-12 items-center rounded-full bg-[#ff4d8d] px-4 font-semibold text-[#1a0b12]">{lang === "he" ? "לוח הזמנות" : "Order board"}</a>
              <Button className="h-12 rounded-full" variant="outline" onClick={() => setCreating((value) => !value)}>{lang === "he" ? "יצירת עסק" : "Create a business"}</Button>
            </div>
            {creating ? (
              <form onSubmit={createVenue} className="grid gap-3 rounded-3xl bg-[#241c16] p-4 sm:grid-cols-2">
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "שם בעברית" : "Hebrew name"}<Input className="mt-1 h-12" value={form.nameHe} onChange={(event) => setForm({ ...form, nameHe: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "שם באנגלית" : "English name"}<Input className="mt-1 h-12" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "כתובת בעברית" : "Hebrew address"}<Input className="mt-1 h-12" value={form.addressHe} onChange={(event) => setForm({ ...form, addressHe: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "כתובת באנגלית" : "English address"}<Input className="mt-1 h-12" value={form.addressEn} onChange={(event) => setForm({ ...form, addressEn: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "סוג בעברית" : "Hebrew kind"}<Input className="mt-1 h-12" value={form.kindHe} onChange={(event) => setForm({ ...form, kindHe: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "סוג באנגלית" : "English kind"}<Input className="mt-1 h-12" value={form.kindEn} onChange={(event) => setForm({ ...form, kindEn: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">{lang === "he" ? "שולחנות" : "Tables"}<Input className="mt-1 h-12" inputMode="numeric" value={form.tableCount} onChange={(event) => setForm({ ...form, tableCount: event.target.value })} required /></label>
                <label className="text-sm text-[#cbbba8]">
                  {lang === "he" ? "העתקת עסק כתבנית" : "Copy another venue as a template"}
                  <select className="mt-1 h-12 w-full rounded-lg border border-white/15 bg-[#1a100c] px-3" value={copyFrom} onChange={(event) => applyTemplate(event.target.value)}>
                    <option value="">{lang === "he" ? "בלי מנות" : "No dishes"}</option>
                    {venues.map((venue) => <option key={venue.slug} value={venue.slug}>{textOf(venue.name, lang)}</option>)}
                  </select>
                </label>
                <Button className="h-12 sm:col-span-2" type="submit">{lang === "he" ? "יצירה" : "Create"}</Button>
              </form>
            ) : null}
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
