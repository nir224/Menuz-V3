"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatIls,
  previewPackage,
  statusLine,
  t,
  textOf,
  type CartLine,
  type Lang,
  type MenuPackage,
  type VenueSnapshot,
} from "@menuz/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";

type Order = {
  id: string;
  status: "received" | "accepted" | "ready" | "served" | "void";
  totalCents: number;
  waitMinutes: [number, number];
  paymentMode: "pay_at_table";
  createdAt: string;
  waiterName: string;
};

const sourceKey = {
  "public-menu": "sourcePublic",
  "lead-estimate": "sourceEstimate",
  demo: "sourceDemo",
} as const;

export function MenuExperience({ slug, code }: { slug: string; code: string }) {
  const [lang, setLang] = useState<Lang>("he");
  const [snapshot, setSnapshot] = useState<VenueSnapshot | null>(null);
  const [error, setError] = useState("");
  const [packageId, setPackageId] = useState<string | null>(null);
  const [guests, setGuests] = useState(4);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [filters, setFilters] = useState({ vegetarian: false, glutenFree: false, noNuts: false });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);
  const [pending, setPending] = useState<CartLine | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [idem, setIdem] = useState("");

  const copy = t(lang);

  useEffect(() => {
    const stored = window.localStorage.getItem("menuz-lang");
    if (stored === "en" || stored === "he") setLang(stored);
    setAgeOk(window.sessionStorage.getItem("menuz-age") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    window.localStorage.setItem("menuz-lang", lang);
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    api<VenueSnapshot>(`/venues/${slug}`)
      .then((next) => {
        if (cancelled) return;
        setSnapshot(next);
        const pkg = next.packages.find((entry) => entry.active !== false);
        setPackageId(pkg?.id ?? null);
        if (pkg) openPackage(pkg);
      })
      .catch(() => {
        if (!cancelled) setError("load");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const table = snapshot?.venue.tables.find((entry) => entry.code === code) ?? null;
  const activePackages = snapshot?.packages.filter((entry) => entry.active !== false) ?? [];
  const pkg = activePackages.find((entry) => entry.id === packageId) ?? activePackages[0] ?? null;
  const preview = useMemo(() => {
    if (!snapshot || !pkg) return null;
    return previewPackage(snapshot, pkg, guests, selection);
  }, [snapshot, pkg, guests, selection]);

  function openPackage(next: MenuPackage) {
    setPackageId(next.id);
    setGuests(next.defaultGuests);
    setSelection(Object.fromEntries(next.components.map((component) => [component.slot, component.defaultItemId])));
    setOpenSlot(null);
  }

  function remember(line: CartLine) {
    setCart((current) => [...current, line]);
    setCartOpen(true);
  }

  function askOrAdd(line: CartLine, alcohol: boolean) {
    if (alcohol && !ageOk) {
      setPending(line);
      setAgeOpen(true);
      return;
    }
    remember(line);
  }

  function confirmAge() {
    setAgeOk(true);
    window.sessionStorage.setItem("menuz-age", "1");
    setAgeOpen(false);
    if (pending) remember(pending);
    setPending(null);
  }

  useEffect(() => {
    if (!order) return;
    const tick = window.setInterval(() => {
      api<{ order: Order }>(`/orders/${order.id}`)
        .then((result) => setOrder(result.order))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [order?.id]);

  async function sendOrder() {
    if (!snapshot) return;
    setSending(true);
    setSendError("");
    const key = idem || crypto.randomUUID();
    setIdem(key);
    const clientTotalCents = cart.reduce((sum, line) => {
      if (line.type === "item") {
        const item = snapshot.items.find((entry) => entry.id === line.itemId);
        return sum + (item ? item.priceCents * line.qty : 0);
      }
      const match = snapshot.packages.find((entry) => entry.id === line.packageId);
      if (!match) return sum;
      return sum + previewPackage(snapshot, match, line.guests, line.selection).totalCents;
    }, 0);
    try {
      const result = await api<{ order: Order }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          venueSlug: slug,
          tableCode: code,
          cart,
          clientTotalCents,
          idempotencyKey: key,
          note,
          alcoholAck: ageOk,
        }),
      });
      setOrder(result.order);
      setCart([]);
      setNote("");
      setIdem("");
    } catch (caught) {
      const codeName = (caught as { code?: string }).code;
      setSendError(codeName === "price_mismatch" ? "price" : "failed");
    } finally {
      setSending(false);
    }
  }

  if (error || (!snapshot && !error)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#14120f] px-6 text-[#f6efe6]">
        <div className="max-w-sm text-center">
          <p className="text-lg">{error ? copy.loadError : copy.loading}</p>
          {error ? (
            <Button className="mt-4 h-12" onClick={() => window.location.reload()}>
              {copy.retry}
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  if (!snapshot) return null;
  const theme = snapshot.venue.theme;
  const wood = snapshot.venue.skin === "wood";
  const itemsById = new Map(snapshot.items.map((item) => [item.id, item]));
  const cartCount = cart.reduce((sum, line) => sum + (line.type === "package" ? 1 : line.qty), 0);
  const cartTotal = cart.reduce((sum, line) => {
    if (line.type === "item") {
      const item = itemsById.get(line.itemId);
      return sum + (item ? item.priceCents * line.qty : 0);
    }
    const match = snapshot.packages.find((entry) => entry.id === line.packageId);
    return match ? sum + previewPackage(snapshot, match, line.guests, line.selection).totalCents : sum;
  }, 0);

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} lang={lang} className={wood ? "wood-menu min-h-dvh" : "min-h-dvh"} style={wood ? { color: theme.ink } : { background: theme.bg, color: theme.ink }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 px-4 py-4" style={{ background: theme.bg }}>
          <div>
            <p className="text-xs tracking-wide" style={{ color: theme.muted }}>{textOf(snapshot.venue.kind, lang)}</p>
            <h1 className="font-serif text-3xl leading-none">{textOf(snapshot.venue.name, lang)}</h1>
            <p className="mt-1 text-sm" style={{ color: theme.muted }}>
              {table ? textOf(table.label, lang) : copy.badTable}
            </p>
          </div>
          <div className="flex rounded-full p-1" style={{ background: theme.card }} role="group" aria-label={copy.language}>
            {(["he", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={lang === option}
                className="h-12 min-w-12 rounded-full px-3 text-sm font-semibold"
                style={{ background: lang === option ? theme.accent : "transparent", color: lang === option ? theme.accentInk : theme.ink }}
                onClick={() => setLang(option)}
              >
                {option === "he" ? "עב" : "EN"}
              </button>
            ))}
          </div>
        </header>

        {!table ? (
          <section className="px-4 pb-10">
            <h2 className="mb-3 text-xl">{copy.pickTable}</h2>
            <div className="grid grid-cols-3 gap-2">
              {snapshot.venue.tables.map((entry) => (
                <a
                  key={entry.code}
                  href={`/v/${slug}/t/${entry.code}`}
                  className="grid h-14 place-items-center rounded-2xl text-base font-semibold"
                  style={{ background: theme.card }}
                >
                  {entry.code}
                </a>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-1 flex-col gap-6 px-4 pb-28">
            <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{textOf(snapshot.contentNote, lang)}</p>
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={copy.packages}>
              {activePackages.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={pkg?.id === entry.id}
                  className="min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold"
                  style={{ background: pkg?.id === entry.id ? theme.accent : theme.card, color: pkg?.id === entry.id ? theme.accentInk : theme.ink }}
                  onClick={() => openPackage(entry)}
                >
                  {textOf(entry.name, lang)}
                </button>
              ))}
            </div>
            {pkg && preview ? (
            <section className={`rounded-3xl p-4 ${wood ? "wood-card" : ""}`} style={{ background: theme.card, transform: wood ? "rotate(-0.6deg)" : undefined }}>
              <p className="text-sm" style={{ color: theme.accent }}>{textOf(pkg.tagline, lang)}</p>
              <h2 className="mt-1 font-serif text-4xl">{textOf(pkg.name, lang)}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.muted }}>{textOf(pkg.rules, lang)}</p>
              <div className="mt-4 flex items-center justify-between">
                <span>{copy.guests}</span>
                <div className="flex items-center gap-2" dir="ltr">
                  <button type="button" className="grid size-12 place-items-center rounded-full text-2xl" style={{ background: theme.bg }} aria-label="-" onClick={() => setGuests((value) => Math.max(pkg.minGuests, value - 1))}>−</button>
                  <span className="w-8 text-center text-2xl font-semibold tabular-nums">{guests}</span>
                  <button type="button" className="grid size-12 place-items-center rounded-full text-2xl" style={{ background: theme.bg }} aria-label="+" onClick={() => setGuests((value) => Math.min(pkg.maxGuests, value + 1))}>+</button>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {preview.lines.map((line) => {
                  const component = pkg.components.find((entry) => entry.slot === line.slot);
                  if (!component) return null;
                  const open = openSlot === component.slot;
                  return (
                    <li key={component.slot} className="rounded-2xl p-3" style={{ background: theme.bg }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs" style={{ color: theme.muted }}>{textOf(component.label, lang)}</p>
                          <p className="text-base font-semibold">{textOf(line.name, lang)} × {line.qty}</p>
                        </div>
                        <p className="tabular-nums">{formatIls(line.totalCents, lang)}</p>
                      </div>
                      {component.options.length > 1 ? (
                        <button type="button" className="mt-2 min-h-12 text-sm font-semibold underline" style={{ color: theme.accent }} onClick={() => setOpenSlot(open ? null : component.slot)}>
                          {copy.swap}
                        </button>
                      ) : null}
                      {open ? (
                        <div className="mt-2 grid gap-2">
                          {component.options.map((optionId) => {
                            const option = itemsById.get(optionId);
                            if (!option) return null;
                            const delta = option.priceCents - line.unitCents;
                            const selected = selection[component.slot] === optionId;
                            return (
                              <button
                                key={optionId}
                                type="button"
                                disabled={!option.available}
                                className="min-h-12 rounded-xl px-3 text-start disabled:opacity-40"
                                style={{ background: selected ? theme.accent : theme.card, color: selected ? theme.accentInk : theme.ink }}
                                onClick={() => {
                                  setSelection((current) => ({ ...current, [component.slot]: optionId }));
                                  setOpenSlot(null);
                                }}
                              >
                                <span className="font-semibold">{textOf(option.name, lang)}</span>
                                <span className="ms-2 text-sm">{delta === 0 ? "" : `${delta > 0 ? "+" : "−"}${formatIls(Math.abs(delta), lang)} ${copy.each}`}</span>
                                {!option.available ? <span className="ms-2">{copy.soldOut}</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 space-y-1 text-sm" style={{ color: theme.muted }}>
                <div className="flex justify-between"><span>{copy.subtotal}</span><span>{formatIls(preview.subtotalCents, lang)}</span></div>
                {preview.discountCents > 0 ? <div className="flex justify-between"><span>{copy.discount}</span><span>{formatIls(-preview.discountCents, lang)}</span></div> : null}
                <div className="flex justify-between text-lg font-semibold" style={{ color: theme.ink }}>
                  <span>{copy.total}</span>
                  <span>{formatIls(preview.totalCents, lang)}</span>
                </div>
                <p>{formatIls(preview.perPersonCents, lang)} {copy.perPerson}</p>
              </div>
              <Button
                className="mt-4 h-12 w-full text-base font-semibold"
                style={{ background: theme.accent, color: theme.accentInk }}
                disabled={preview.issues.includes("sold_out")}
                onClick={() => askOrAdd({ type: "package", packageId: pkg.id, guests, selection: { ...selection } }, preview.hasAlcohol)}
              >
                {copy.addPackage}
              </Button>
            </section>
            ) : <p className="text-sm" style={{ color: theme.muted }}>{copy.noPackages}</p>}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl">{copy.menu}</h2>
              </div>
              <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={copy.filters}>
                {([
                  ["vegetarian", copy.vegetarian],
                  ["glutenFree", copy.glutenFree],
                  ["noNuts", copy.noNuts],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filters[key]}
                    className="min-h-12 rounded-full px-4 text-sm"
                    style={{ background: filters[key] ? theme.accent : theme.card, color: filters[key] ? theme.accentInk : theme.ink }}
                    onClick={() => setFilters((current) => ({ ...current, [key]: !current[key] }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {snapshot.categories
                .slice()
                .sort((a, b) => a.sort - b.sort)
                .map((category) => {
                  if (category.hidden) return null;
                  const dishes = snapshot.items.filter((item) => {
                    if (item.categoryId !== category.id) return false;
                    if (filters.vegetarian && !item.vegetarian) return false;
                    if (filters.glutenFree && !item.glutenFree) return false;
                    if (filters.noNuts && (item.allergens.includes("nuts") || item.allergens.includes("peanuts"))) return false;
                    return true;
                  });
                  if (!dishes.length) return null;
                  return (
                    <div key={category.id} className="mb-5">
                      <h3 className={wood ? "tape-label mb-3 font-serif text-2xl" : "mb-2 text-sm font-semibold"} style={wood ? undefined : { color: theme.muted }}>{textOf(category.name, lang)}</h3>
                      {category.note ? <p className="mb-2 text-xs" style={{ color: theme.muted }}>{textOf(category.note, lang)}</p> : null}
                      <ul className="space-y-3">
                        {dishes.map((item, index) => (
                          <li key={item.id} className={`overflow-hidden rounded-2xl ${wood ? "wood-card" : ""}`} style={{ background: theme.card, opacity: item.available ? 1 : 0.55, transform: wood ? `rotate(${index % 2 ? 1.2 : -1.2}deg)` : undefined }}>
                            {item.image ? <img src={item.image} alt="" className="h-36 w-full object-cover" /> : null}
                            <div className="flex items-start justify-between gap-3 p-3">
                              <div>
                                <p className="font-semibold">{textOf(item.name, lang)}</p>
                                <p className="mt-1 text-sm leading-relaxed" style={{ color: theme.muted }}>{textOf(item.description, lang)}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.priceSource !== "public-menu" ? <Badge variant="outline">{copy[sourceKey[item.priceSource]]}</Badge> : null}
                                  {item.allergens.map((allergen) => (
                                    <Badge key={allergen} variant="secondary">{copy.allergens[allergen]}</Badge>
                                  ))}
                                  {!item.available ? <Badge>{copy.soldOut}</Badge> : null}
                                </div>
                              </div>
                              <div className="text-end">
                                <p className="tabular-nums">{formatIls(item.priceCents, lang)}</p>
                                <Button
                                  className="mt-2 h-12 min-w-12"
                                  variant="outline"
                                  disabled={!item.available}
                                  onClick={() => askOrAdd({ type: "item", itemId: item.id, qty: 1 }, item.isAlcohol)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </section>
          </div>
        )}

        {table && cartCount > 0 && !order ? (
          <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] p-3">
            <Button className="h-14 w-full justify-between rounded-2xl px-4 text-base" style={{ background: theme.accent, color: theme.accentInk }} onClick={() => setCartOpen(true)}>
              <span>{copy.cart} · {cartCount}</span>
              <span>{formatIls(cartTotal, lang)}</span>
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={ageOpen} onOpenChange={setAgeOpen}>
        <DialogContent className="sm:max-w-sm" style={{ background: theme.card, color: theme.ink }}>
          <DialogHeader>
            <DialogTitle>{copy.alcoholTitle}</DialogTitle>
            <DialogDescription style={{ color: theme.muted }}>{copy.alcoholBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent sm:justify-stretch">
            <Button className="h-12" style={{ background: theme.accent, color: theme.accentInk }} onClick={confirmAge}>{copy.confirmAge}</Button>
            <Button className="h-12" variant="outline" onClick={() => { setAgeOpen(false); setPending(null); }}>{copy.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={cartOpen || Boolean(order)} onOpenChange={(open) => { if (!order) setCartOpen(open); }}>
        <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-3xl" style={{ background: theme.card, color: theme.ink, left: "max(0px, calc(50% - 215px))", right: "auto", width: "min(430px, 100%)" }}>
          {order ? (
            <>
              <SheetHeader>
                <SheetTitle>{copy.orderIn} {order.id}</SheetTitle>
                <SheetDescription style={{ color: theme.muted }}>{copy.payAtTable} · {copy.unpaid}</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                <p className="text-3xl font-semibold tabular-nums">{formatIls(order.totalCents, lang)}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums"><Elapsed since={order.createdAt} /></p>
                <p style={{ color: theme.muted }}>{copy.elapsed}</p>
                <p className="mt-2" style={{ color: theme.muted }}>{copy.wait}: {order.waitMinutes[0]}–{order.waitMinutes[1]} {copy.minutes}</p>
                <p className="mt-1">{statusLine(lang, order.status, order.waiterName)}</p>
                <Button className="mt-6 h-12 w-full" variant="outline" onClick={() => { setOrder(null); setCartOpen(false); }}>{copy.backToMenu}</Button>
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{copy.cart}</SheetTitle>
                <SheetDescription style={{ color: theme.muted }}>{table ? textOf(table.label, lang) : ""} · {copy.payAtTable}</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-2">
                {cart.length === 0 ? <p style={{ color: theme.muted }}>{copy.emptyCart}</p> : null}
                {cart.map((line, index) => (
                  <div key={`${line.type}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl p-3" style={{ background: theme.bg }}>
                    <div>
                      {line.type === "package" ? (
                        <PackageCartLine snapshot={snapshot} line={line} lang={lang} muted={theme.muted} />
                      ) : (
                        <p className="font-semibold">{textOf(itemsById.get(line.itemId)?.name ?? { he: "", en: "" }, lang)} × {line.qty}</p>
                      )}
                    </div>
                    <button type="button" className="min-h-12 text-sm underline" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{copy.remove}</button>
                  </div>
                ))}
                <label className="block text-sm" style={{ color: theme.muted }}>
                  {copy.note}
                  <Input className="mt-1 h-12" value={note} placeholder={copy.notePlaceholder} onChange={(event) => setNote(event.target.value)} />
                </label>
                {sendError ? <p className="text-sm">{sendError === "price" ? copy.priceMismatch : copy.sendFailed}</p> : null}
              </div>
              <SheetFooter className="shrink-0">
                <Button className="h-12 w-full text-base" style={{ background: theme.accent, color: theme.accentInk }} disabled={!cart.length || sending} onClick={sendOrder}>
                  {sending ? copy.sending : `${copy.send} · ${formatIls(cartTotal, lang)}`}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PackageCartLine({
  snapshot,
  line,
  lang,
  muted,
}: {
  snapshot: VenueSnapshot;
  line: Extract<CartLine, { type: "package" }>;
  lang: Lang;
  muted: string;
}) {
  const match = snapshot.packages.find((entry) => entry.id === line.packageId);
  if (!match) return null;
  return (
    <>
      <p className="font-semibold">{textOf(match.name, lang)} · {line.guests}</p>
      <p className="text-sm" style={{ color: muted }}>{formatIls(previewPackage(snapshot, match, line.guests, line.selection).totalCents, lang)}</p>
    </>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const minutes = Math.floor(seconds / 60);
  return <span>{minutes}:{String(seconds % 60).padStart(2, "0")}</span>;
}
