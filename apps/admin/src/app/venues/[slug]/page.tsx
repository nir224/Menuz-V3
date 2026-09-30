"use client";

import { use, useEffect, useState } from "react";
import { formatIls, textOf, type Lang, type VenueSnapshot } from "@menuz/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";

type DraftResponse = { draft: VenueSnapshot; publishedVersion: number };

export default function VenueEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [lang, setLang] = useState<Lang>("he");
  const [draft, setDraft] = useState<VenueSnapshot | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("menuz-lang");
    if (stored === "en" || stored === "he") setLang(stored);
    if (!getToken()) {
      window.location.href = "/";
      return;
    }
    api<DraftResponse>(`/admin/venues/${slug}`)
      .then((result) => {
        setDraft(result.draft);
        setPublishedVersion(result.publishedVersion);
      })
      .catch(() => setMessage("Could not load."));
  }, [slug]);

  function updateItem(id: string, patch: { priceShekels?: string; available?: boolean }) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== id) return item;
          const next = { ...item };
          if (patch.available !== undefined) next.available = patch.available;
          if (patch.priceShekels !== undefined) {
            const shekels = Number(patch.priceShekels);
            if (Number.isFinite(shekels)) next.priceCents = Math.round(shekels * 100);
          }
          return next;
        }),
      };
    });
  }

  async function writeDraft() {
    if (!draft) return;
    const result = await api<{ draft: VenueSnapshot }>(`/admin/venues/${slug}`, {
      method: "PUT",
      body: JSON.stringify({
        items: draft.items.map((item) => ({ id: item.id, priceCents: item.priceCents, available: item.available })),
      }),
    });
    setDraft(result.draft);
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await writeDraft();
      setMessage(lang === "he" ? "הטיוטה נשמרה. האורחים עדיין רואים את הגרסה שפורסמה." : "Draft saved. Guests still see the published version.");
    } catch {
      setMessage(lang === "he" ? "השמירה נכשלה." : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMessage("");
    try {
      await writeDraft();
      const result = await api<{ snapshot: VenueSnapshot }>(`/admin/venues/${slug}/publish`, { method: "POST" });
      setDraft(result.snapshot);
      setPublishedVersion(result.snapshot.version);
      setMessage(lang === "he" ? `פורסם. גרסה ${result.snapshot.version} חיה בתפריט האורח.` : `Published. Version ${result.snapshot.version} is live on the guest menu.`);
    } catch {
      setMessage(lang === "he" ? "הפרסום נכשל." : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return <main className="min-h-dvh bg-[#14120f] p-8 text-[#f6efe6]">{lang === "he" ? "טוען…" : "Loading…"}</main>;
  }

  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="min-h-dvh bg-[#14120f] text-[#f6efe6]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <a href="/" className="text-sm text-[#cbbba8] underline">{lang === "he" ? "חזרה" : "Back"}</a>
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl">{textOf(draft.venue.name, lang)}</h1>
            <p className="text-sm text-[#cbbba8]">{lang === "he" ? "מפורסם" : "Published"} v{publishedVersion} · {lang === "he" ? "טיוטה" : "Draft"} v{draft.version}</p>
          </div>
          <Button variant="outline" className="h-12" onClick={() => setLang(lang === "he" ? "en" : "he")}>{lang === "he" ? "EN" : "עב"}</Button>
        </header>
        <ul className="space-y-2">
          {draft.items.map((item) => (
            <li key={item.id} className="grid gap-3 rounded-2xl bg-[#241c16] p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-center">
              <div>
                <p className="font-semibold">{textOf(item.name, lang)}</p>
                <p className="text-xs text-[#cbbba8]">{formatIls(item.priceCents, lang)}</p>
              </div>
              <label className="text-xs text-[#cbbba8]">
                ₪
                <Input
                  className="mt-1 h-12"
                  inputMode="decimal"
                  value={item.priceCents / 100}
                  onChange={(event) => updateItem(item.id, { priceShekels: event.target.value })}
                />
              </label>
              <label className="flex min-h-12 items-center gap-2 text-sm">
                <input type="checkbox" checked={item.available} onChange={(event) => updateItem(item.id, { available: event.target.checked })} />
                {item.available ? (lang === "he" ? "זמין" : "Available") : (lang === "he" ? "אזל" : "Sold out")}
              </label>
            </li>
          ))}
        </ul>
        {message ? <p className="text-sm">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button className="h-12" disabled={busy} onClick={save}>{lang === "he" ? "שמירת טיוטה" : "Save draft"}</Button>
          <Button className="h-12" variant="secondary" disabled={busy} onClick={publish}>{lang === "he" ? "פרסום לתפריט" : "Publish to the menu"}</Button>
        </div>
      </div>
    </main>
  );
}
