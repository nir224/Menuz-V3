"use client";

import { useEffect, useRef, useState } from "react";
import { formatIls, statusLine, textOf, type Lang, type OrderStatus } from "@menuz/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";

type Ticket = {
  id: string;
  venueSlug: string;
  tableLabelHe: string;
  tableLabelEn: string;
  status: OrderStatus;
  note: string;
  totalCents: number;
  paymentMode: "pay_at_table";
  groups: { name: { he: string; en: string }; guests: number; lines: { name: { he: string; en: string }; qty: number }[] }[];
  singles: { name: { he: string; en: string }; qty: number }[];
  createdAt: string;
  waiterName?: string;
};

type VenueChip = { slug: string; name: { he: string; en: string } };

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "accepted",
  accepted: "ready",
  ready: "served",
};

export default function StaffBoard() {
  const [lang, setLang] = useState<Lang>("he");
  const [orders, setOrders] = useState<Ticket[]>([]);
  const [venue, setVenue] = useState("all");
  const [venues, setVenues] = useState<VenueChip[]>([]);
  const [waiterName, setWaiterName] = useState("");
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("menuz-lang");
    if (stored === "en" || stored === "he") setLang(stored);
    if (!getToken()) window.location.href = "/";
    const storedName = window.localStorage.getItem("menuz-waiter-name") ?? "";
    setWaiterName(storedName);
    api<{ venues: VenueChip[] }>("/venues").then((result) => setVenues(result.venues)).catch(() => undefined);
    document.documentElement.lang = stored === "en" ? "en" : "he";
    document.documentElement.dir = stored === "en" ? "ltr" : "rtl";
  }, []);

  async function refresh(filter = venue) {
    const result = await api<{ orders: Ticket[] }>(`/staff/orders?venue=${filter}`);
    if (primed.current) {
      for (const order of result.orders) {
        if (!seen.current.has(order.id) && order.status === "received") beep();
      }
    }
    seen.current = new Set(result.orders.map((order) => order.id));
    primed.current = true;
    setOrders(result.orders);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    refresh(venue).catch(() => undefined);
    const source = new EventSource(`/menuz-api/staff/orders/stream?token=${encodeURIComponent(token)}&venue=${venue}`);
    const onChange = () => refresh(venue).catch(() => undefined);
    source.addEventListener("order", onChange);
    source.addEventListener("status", onChange);
    const poll = window.setInterval(onChange, 4000);
    return () => {
      source.close();
      window.clearInterval(poll);
    };
  }, [venue]);

  async function move(id: string, status: OrderStatus) {
    await api(`/staff/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(status === "accepted" ? { status, waiterName } : { status }),
    });
    await refresh();
  }

  const copy = lang === "he"
    ? { title: "לוח הזמנות", all: "הכל", unpaid: "לתשלום אצל הצוות", empty: "אין הזמנות פתוחות.", void: "ביטול", name: "השם על הטלפון הזה", take: "קבלת הזמנה", next: { ready: "מוכנה", served: "הוגשה" } as Record<string, string> }
    : { title: "Order board", all: "All", unpaid: "Pay the staff", empty: "No open orders.", void: "Void", name: "Name on this phone", take: "Take order", next: { ready: "Ready", served: "Served" } as Record<string, string> };

  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="min-h-dvh bg-[#100e0c] text-[#f6efe6]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-[#cbbba8] underline">{lang === "he" ? "ניהול" : "Admin"}</a>
            <h1 className="font-serif text-4xl">{copy.title}</h1>
          </div>
          <Button variant="outline" className="h-12" onClick={() => setLang(lang === "he" ? "en" : "he")}>{lang === "he" ? "EN" : "עב"}</Button>
        </div>
        <label className="block text-sm text-[#cbbba8]">
          {copy.name}
          <Input
            className="mt-1 h-12 max-w-sm"
            value={waiterName}
            onChange={(event) => {
              setWaiterName(event.target.value);
              window.localStorage.setItem("menuz-waiter-name", event.target.value);
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-12 rounded-full px-4" style={{ background: venue === "all" ? "#ff4d8d" : "#241c16", color: venue === "all" ? "#1a0b12" : "#f6efe6" }} onClick={() => setVenue("all")}>{copy.all}</button>
          {venues.map((entry) => (
            <button key={entry.slug} type="button" className="h-12 rounded-full px-4" style={{ background: venue === entry.slug ? "#ff4d8d" : "#241c16", color: venue === entry.slug ? "#1a0b12" : "#f6efe6" }} onClick={() => setVenue(entry.slug)}>
              {textOf(entry.name, lang)}
            </button>
          ))}
        </div>
        {orders.length === 0 ? <p className="text-[#cbbba8]">{copy.empty}</p> : null}
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-3xl bg-[#241c16] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#cbbba8]">{order.venueSlug} · {order.id}</p>
                  <h2 className="text-2xl font-semibold">{lang === "he" ? order.tableLabelHe : order.tableLabelEn}</h2>
                </div>
                <div className="text-end">
                  <p className="text-lg tabular-nums">{formatIls(order.totalCents, lang)}</p>
                  <p className="text-sm text-[#e0b15a]">{copy.unpaid}</p>
                </div>
              </div>
              <p className="mt-2 text-sm">{statusLine(lang, order.status, order.waiterName ?? "")}</p>
              <p className="text-lg font-semibold tabular-nums"><Elapsed since={order.createdAt} /></p>
              <ul className="mt-3 space-y-1 text-sm">
                {order.groups.map((group, index) => (
                  <li key={`${order.id}-g-${index}`}>
                    <span className="font-semibold">{textOf(group.name, lang)} · {group.guests}</span>
                    <ul className="ps-4 text-[#cbbba8]">
                      {group.lines.map((line) => <li key={line.name.he}>{textOf(line.name, lang)} × {line.qty}</li>)}
                    </ul>
                  </li>
                ))}
                {order.singles.map((line) => <li key={line.name.he}>{textOf(line.name, lang)} × {line.qty}</li>)}
              </ul>
              {order.note ? <p className="mt-2 text-sm text-[#cbbba8]">{order.note}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === "received" ? (
                  <Button className="h-12" disabled={!waiterName.trim()} onClick={() => move(order.id, "accepted")}>{copy.take}</Button>
                ) : null}
                {order.status === "accepted" || order.status === "ready" ? (
                  <Button className="h-12" onClick={() => move(order.id, nextStatus[order.status] as OrderStatus)}>{copy.next[nextStatus[order.status] as string]}</Button>
                ) : null}
                {order.status !== "served" && order.status !== "void" ? (
                  <Button className="h-12" variant="outline" onClick={() => move(order.id, "void")}>{copy.void}</Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
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

function beep() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch {
    /* autoplay can block the first sound */
  }
}
