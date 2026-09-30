"use client";

import { use, useEffect, useState } from "react";
import { basicSections, formatIls, textOf, type Lang, type MenuCategory, type MenuPackage, type VenueSnapshot } from "@menuz/core";
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

  function patchDraft(recipe: (current: VenueSnapshot) => VenueSnapshot) {
    setDraft((current) => (current ? recipe(current) : current));
  }

  function moveSection(id: string, direction: -1 | 1) {
    patchDraft((current) => {
      const categories = [...current.categories].sort((a, b) => a.sort - b.sort);
      const index = categories.findIndex((category) => category.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= categories.length) return current;
      const swap = categories[index];
      categories[index] = categories[next];
      categories[next] = swap;
      return { ...current, categories: categories.map((category, order) => ({ ...category, sort: order + 1 })) };
    });
  }

  function addSection(id: string) {
    patchDraft((current) => {
      if (current.categories.some((category) => category.id === id)) return current;
      const known = basicSections.find((section) => section.id === id);
      const category: MenuCategory = known
        ? { id: known.id, name: { ...known.name }, sort: current.categories.length + 1, hidden: false }
        : { id: `s${Date.now().toString(36)}`, name: { he: "סעיף חדש", en: "New section" }, sort: current.categories.length + 1, hidden: false };
      return { ...current, categories: [...current.categories, category] };
    });
  }

  function addPackage() {
    patchDraft((current) => {
      const first = current.items[0];
      if (!first) return current;
      const pkg: MenuPackage = {
        id: `p${Date.now().toString(36)}`,
        name: { he: "חבילה חדשה", en: "New package" },
        tagline: { he: "חבילה לשולחן", en: "A package for the table" },
        rules: { he: "מנה אחת לאדם.", en: "One dish per person." },
        minGuests: 2,
        maxGuests: 12,
        defaultGuests: 4,
        discountPct: 0,
        active: true,
        components: [
          {
            slot: "main",
            label: { he: "מנה לכל אחד", en: "Dish each" },
            mode: "per_guest",
            chunkSize: 1,
            qty: 1,
            defaultItemId: first.id,
            options: [first.id],
          },
        ],
      };
      return { ...current, packages: [...current.packages, pkg] };
    });
  }

  async function writeDraft() {
    if (!draft) return;
    const result = await api<{ draft: VenueSnapshot }>(`/admin/venues/${slug}`, {
      method: "PUT",
      body: JSON.stringify({
        items: draft.items.map((item) => ({ id: item.id, priceCents: item.priceCents, available: item.available })),
        categories: draft.categories,
        packages: draft.packages,
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
        <section className="space-y-2 rounded-3xl bg-[#241c16] p-4">
          <h2 className="font-serif text-2xl">{lang === "he" ? "סעיפים" : "Sections"}</h2>
          {[...draft.categories].sort((a, b) => a.sort - b.sort).map((category) => (
            <div key={category.id} className="grid gap-2 rounded-2xl bg-[#1a100c] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <Input className="h-12" value={category.name.he} onChange={(event) => patchDraft((current) => ({ ...current, categories: current.categories.map((entry) => entry.id === category.id ? { ...entry, name: { ...entry.name, he: event.target.value } } : entry) }))} />
              <Input className="h-12" value={category.name.en} onChange={(event) => patchDraft((current) => ({ ...current, categories: current.categories.map((entry) => entry.id === category.id ? { ...entry, name: { ...entry.name, en: event.target.value } } : entry) }))} />
              <div className="flex flex-wrap gap-2">
                <Button className="h-12" variant="outline" onClick={() => moveSection(category.id, -1)}>{lang === "he" ? "למעלה" : "Up"}</Button>
                <Button className="h-12" variant="outline" onClick={() => moveSection(category.id, 1)}>{lang === "he" ? "למטה" : "Down"}</Button>
                <label className="flex min-h-12 items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(category.hidden)} onChange={(event) => patchDraft((current) => ({ ...current, categories: current.categories.map((entry) => entry.id === category.id ? { ...entry, hidden: event.target.checked } : entry) }))} />
                  {lang === "he" ? "מוסתר" : "Hidden"}
                </label>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <select className="h-12 rounded-lg border border-white/15 bg-[#1a100c] px-3" defaultValue="" onChange={(event) => { if (event.target.value) { addSection(event.target.value); event.target.value = ""; } }}>
              <option value="">{lang === "he" ? "הוספת סעיף בסיסי" : "Add a basic section"}</option>
              {basicSections.map((section) => <option key={section.id} value={section.id}>{textOf(section.name, lang)}</option>)}
            </select>
            <Button className="h-12" variant="outline" onClick={() => addSection("custom")}>{lang === "he" ? "סעיף ריק" : "Blank section"}</Button>
          </div>
        </section>
        <section className="space-y-3 rounded-3xl bg-[#241c16] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">{lang === "he" ? "חבילות" : "Packages"}</h2>
            <Button className="h-12" variant="outline" disabled={draft.items.length === 0} onClick={addPackage}>{lang === "he" ? "חבילה חדשה" : "New package"}</Button>
          </div>
          {draft.packages.map((pkg) => (
            <div key={pkg.id} className="space-y-2 rounded-2xl bg-[#1a100c] p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input className="h-12" value={pkg.name.he} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, name: { ...entry.name, he: event.target.value } } : entry) }))} />
                <Input className="h-12" value={pkg.name.en} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, name: { ...entry.name, en: event.target.value } } : entry) }))} />
                <Input className="h-12" value={pkg.tagline.he} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, tagline: { ...entry.tagline, he: event.target.value } } : entry) }))} />
                <Input className="h-12" value={pkg.tagline.en} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, tagline: { ...entry.tagline, en: event.target.value } } : entry) }))} />
                <Input className="h-12 sm:col-span-2" value={pkg.rules.he} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, rules: { ...entry.rules, he: event.target.value } } : entry) }))} />
                <Input className="h-12 sm:col-span-2" value={pkg.rules.en} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, rules: { ...entry.rules, en: event.target.value } } : entry) }))} />
              </div>
              <label className="flex min-h-12 items-center gap-2 text-sm">
                <input type="checkbox" checked={pkg.active !== false} onChange={(event) => patchDraft((current) => ({ ...current, packages: current.packages.map((entry) => entry.id === pkg.id ? { ...entry, active: event.target.checked } : entry) }))} />
                {pkg.active !== false ? (lang === "he" ? "פעילה לאורחים" : "On for guests") : (lang === "he" ? "כבויה" : "Off")}
              </label>
              {pkg.components.map((component) => (
                <div key={component.slot} className="rounded-xl border border-white/10 p-2 text-sm">
                  <p>{textOf(component.label, lang)} · {component.mode === "per_guest" ? (lang === "he" ? "לכל אורח" : "Per guest") : (lang === "he" ? `לכל ${component.chunkSize}` : `Every ${component.chunkSize}`)}</p>
                  <label className="mt-1 block text-[#cbbba8]">
                    {lang === "he" ? "מנות בחריץ" : "Dishes in this slot"}
                    <select
                      multiple
                      className="mt-1 min-h-24 w-full rounded-lg bg-[#241c16] p-2"
                      value={component.options}
                      onChange={(event) => {
                        const options = [...event.target.selectedOptions].map((option) => option.value);
                        patchDraft((current) => ({
                          ...current,
                          packages: current.packages.map((entry) => entry.id === pkg.id ? {
                            ...entry,
                            components: entry.components.map((slot) => slot.slot === component.slot ? {
                              ...slot,
                              options: options.length ? options : slot.options,
                              defaultItemId: options.includes(slot.defaultItemId) ? slot.defaultItemId : (options[0] ?? slot.defaultItemId),
                            } : slot),
                          } : entry),
                        }));
                      }}
                    >
                      {draft.items.map((item) => <option key={item.id} value={item.id}>{textOf(item.name, lang)}</option>)}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          ))}
        </section>
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
