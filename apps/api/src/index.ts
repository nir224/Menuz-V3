import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import {
  basicCategories,
  priceCart,
  seeds,
  type CartLine,
  type MenuCategory,
  type MenuPackage,
  type OrderStatus,
  type Text,
  type VenueSnapshot,
} from "@menuz/core";
import Fastify from "fastify";

const PORT = Number(process.env.MENUZ_API_PORT || 43121);
const PASSWORD = process.env.MENUZ_ADMIN_PASSWORD || "tableside";
const SECRET = process.env.MENUZ_ADMIN_SECRET || "menuz-local-dev";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = path.join(root, "data");
const publishedDir = path.join(dataDir, "published");
const draftDir = path.join(dataDir, "drafts");
const ordersPath = path.join(dataDir, "orders.json");

type StoredOrder = {
  id: string;
  venueSlug: string;
  tableCode: string;
  tableLabelHe: string;
  tableLabelEn: string;
  status: OrderStatus;
  paymentMode: "pay_at_table";
  note: string;
  totalCents: number;
  hasPackage: boolean;
  groups: ReturnType<typeof priceCart>["groups"];
  singles: ReturnType<typeof priceCart>["singles"];
  waitMinutes: [number, number];
  createdAt: string;
  waiterName: string;
};

type OrderFile = {
  seq: number;
  orders: StoredOrder[];
  idem: Record<string, { orderId: string; at: string }>;
};

const listeners = new Set<{
  venue: string;
  write: (event: string, data: unknown) => void;
}>();

let chain: Promise<unknown> = Promise.resolve();

function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureStore() {
  await mkdir(publishedDir, { recursive: true });
  await mkdir(draftDir, { recursive: true });
  for (const seed of seeds) {
    const publishedPath = path.join(publishedDir, `${seed.venue.slug}.json`);
    const draftPath = path.join(draftDir, `${seed.venue.slug}.json`);
    const published = await readSnapshot(publishedDir, seed.venue.slug);
    const stale = !published || (published.version === 1 && published.seedKey !== seed.seedKey);
    if (stale) {
      const body = JSON.stringify(seed, null, 2);
      await writeFile(publishedPath, body);
      await writeFile(draftPath, body);
      continue;
    }
    try {
      await readFile(draftPath, "utf8");
    } catch {
      await writeFile(draftPath, JSON.stringify(published, null, 2));
    }
  }
  try {
    await readFile(ordersPath, "utf8");
  } catch {
    await writeFile(ordersPath, JSON.stringify({ seq: 1000, orders: [], idem: {} }, null, 2));
  }
}

async function readSnapshot(dir: string, slug: string): Promise<VenueSnapshot | null> {
  try {
    return JSON.parse(await readFile(path.join(dir, `${slug}.json`), "utf8")) as VenueSnapshot;
  } catch {
    return null;
  }
}

async function readOrders(): Promise<OrderFile> {
  return JSON.parse(await readFile(ordersPath, "utf8")) as OrderFile;
}

async function writeOrders(file: OrderFile) {
  await writeFile(ordersPath, JSON.stringify(file, null, 2));
}

function sign(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string | undefined): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function tokenFrom(request: { headers: { authorization?: string }; query: unknown }) {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const query = request.query as { token?: string };
  return query.token;
}

function broadcast(venue: string, event: string, data: unknown) {
  for (const listener of listeners) {
    if (listener.venue === "all" || listener.venue === venue) listener.write(event, data);
  }
}

const allowedNext: Record<OrderStatus, OrderStatus[]> = {
  received: ["accepted", "void"],
  accepted: ["ready", "void"],
  ready: ["served", "void"],
  served: [],
  void: [],
};

const app = Fastify({ logger: false });
await app.register(cors, { origin: true });

app.get("/api/v1/health", async () => ({ ok: true }));

async function listPublished(): Promise<VenueSnapshot[]> {
  const files = await readdir(publishedDir);
  const snapshots: VenueSnapshot[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const snapshot = await readSnapshot(publishedDir, file.slice(0, -5));
    if (snapshot) snapshots.push(snapshot);
  }
  snapshots.sort((a, b) => (a.venue.homeSort ?? 100) - (b.venue.homeSort ?? 100) || a.venue.name.he.localeCompare(b.venue.name.he, "he"));
  return snapshots;
}

function venueCard(snapshot: VenueSnapshot) {
  return {
    slug: snapshot.venue.slug,
    name: snapshot.venue.name,
    kind: snapshot.venue.kind,
    address: snapshot.venue.address,
    theme: snapshot.venue.theme,
    blurb: snapshot.venue.blurb ?? snapshot.contentNote,
    hero: snapshot.venue.hero ?? "",
    skin: snapshot.venue.skin ?? "cards",
    version: snapshot.version,
  };
}

app.get("/api/v1/venues", async () => {
  const venues = (await listPublished()).map(venueCard);
  return { venues };
});

app.get<{ Params: { slug: string } }>("/api/v1/venues/:slug", async (request, reply) => {
  const snapshot = await readSnapshot(publishedDir, request.params.slug);
  if (!snapshot) return reply.code(404).send({ error: "unknown_venue" });
  return snapshot;
});

app.post<{ Body: { password?: string } }>("/api/v1/admin/login", async (request, reply) => {
  const password = request.body?.password ?? "";
  const a = Buffer.from(password);
  const b = Buffer.from(PASSWORD);
  const matches = a.length === b.length && timingSafeEqual(a, b);
  if (!matches) return reply.code(401).send({ error: "bad_password" });
  return { token: sign({ exp: Date.now() + 12 * 60 * 60 * 1000, nonce: randomBytes(8).toString("hex") }) };
});

app.get<{ Params: { slug: string } }>("/api/v1/admin/venues/:slug", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  const draft = await readSnapshot(draftDir, request.params.slug);
  const published = await readSnapshot(publishedDir, request.params.slug);
  if (!draft) return reply.code(404).send({ error: "unknown_venue" });
  return { draft, publishedVersion: published?.version ?? 0 };
});

app.post<{
  Body: {
    nameHe?: string;
    nameEn?: string;
    addressHe?: string;
    addressEn?: string;
    kindHe?: string;
    kindEn?: string;
    tableCount?: number;
    copyFrom?: string;
  };
}>("/api/v1/admin/venues", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  const body = request.body ?? {};
  const name = cleanText(body.nameHe, body.nameEn, 80);
  const address = cleanText(body.addressHe, body.addressEn, 120);
  const kind = cleanText(body.kindHe, body.kindEn, 80);
  const tableCount = Number(body.tableCount);
  if (!name || !address || !kind || !Number.isInteger(tableCount) || tableCount < 1 || tableCount > 40) {
    return reply.code(400).send({ error: "bad_venue" });
  }
  return exclusive(async () => {
    const sourceSlug = (body.copyFrom ?? "").trim();
    const source = sourceSlug ? (await readSnapshot(draftDir, sourceSlug)) ?? (await readSnapshot(publishedDir, sourceSlug)) : null;
    if (sourceSlug && !source) return reply.code(404).send({ error: "unknown_venue" });
    const existing = new Set((await listPublished()).map((snapshot) => snapshot.venue.slug));
    for (const file of await readdir(draftDir)) {
      if (file.endsWith(".json")) existing.add(file.slice(0, -5));
    }
    const slug = uniqueSlug(name.en || name.he, existing);
    const now = new Date().toISOString();
    const snapshot: VenueSnapshot = source
      ? structuredClone(source)
      : {
          version: 1,
          publishedAt: now,
          contentNote: {
            he: "עסק חדש. אין עדיין מנות.",
            en: "A new business. No dishes yet.",
          },
          venue: {
            slug,
            name,
            kind,
            address,
            theme: {
              bg: "#1a100c",
              ink: "#f6efe6",
              muted: "#cbbba8",
              accent: "#e0b15a",
              accentInk: "#1a100c",
              card: "#2a1b14",
            },
            alcoholNotice: {
              he: "אלכוהול מגיל 18. ייתכן שיבקשו תעודה מזהה.",
              en: "Alcohol is 18+. Staff may ask for ID.",
            },
            tables: makeTables(tableCount),
            blurb: { he: "", en: "" },
            hero: "",
            skin: "cards",
            homeSort: 100,
          },
          categories: basicCategories(),
          items: [],
          packages: [],
        };
    snapshot.venue.slug = slug;
    snapshot.venue.name = name;
    snapshot.venue.address = address;
    snapshot.venue.kind = kind;
    snapshot.venue.tables = makeTables(tableCount);
    snapshot.venue.homeSort = 100 + existing.size;
    delete snapshot.seedKey;
    snapshot.version = 1;
    snapshot.publishedAt = now;
    const saved = JSON.stringify(snapshot, null, 2);
    await writeFile(path.join(draftDir, `${slug}.json`), saved);
    await writeFile(path.join(publishedDir, `${slug}.json`), saved);
    return reply.code(201).send({ draft: snapshot });
  });
});

app.put<{
  Params: { slug: string };
  Body: {
    items?: { id: string; priceCents: number; available: boolean }[];
    categories?: MenuCategory[];
    packages?: MenuPackage[];
  };
}>("/api/v1/admin/venues/:slug", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  return exclusive(async () => {
    const draft = await readSnapshot(draftDir, request.params.slug);
    if (!draft) return reply.code(404).send({ error: "unknown_venue" });
    const updates = new Map((request.body?.items ?? []).map((item) => [item.id, item]));
    for (const item of draft.items) {
      const next = updates.get(item.id);
      if (!next) continue;
      if (!Number.isInteger(next.priceCents) || next.priceCents < 0 || next.priceCents > 1000000) {
        return reply.code(400).send({ error: "bad_price" });
      }
      item.priceCents = next.priceCents;
      item.available = Boolean(next.available);
    }
    if (request.body?.categories) {
      const categories = sanitizeCategories(request.body.categories);
      if (!categories) return reply.code(400).send({ error: "bad_section" });
      const ids = new Set(categories.map((category) => category.id));
      if (draft.items.some((item) => !ids.has(item.categoryId))) return reply.code(400).send({ error: "bad_section" });
      draft.categories = categories;
    }
    if (request.body?.packages) {
      const packages = sanitizePackages(request.body.packages, new Set(draft.items.map((item) => item.id)));
      if (!packages) return reply.code(400).send({ error: "bad_package" });
      draft.packages = packages;
    }
    await writeFile(path.join(draftDir, `${draft.venue.slug}.json`), JSON.stringify(draft, null, 2));
    return { draft };
  });
});

app.post<{ Params: { slug: string } }>("/api/v1/admin/venues/:slug/publish", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  return exclusive(async () => {
    const draft = await readSnapshot(draftDir, request.params.slug);
    if (!draft) return reply.code(404).send({ error: "unknown_venue" });
    const published = await readSnapshot(publishedDir, request.params.slug);
    draft.version = (published?.version ?? draft.version) + 1;
    draft.publishedAt = new Date().toISOString();
    const body = JSON.stringify(draft, null, 2);
    await writeFile(path.join(draftDir, `${draft.venue.slug}.json`), body);
    await writeFile(path.join(publishedDir, `${draft.venue.slug}.json`), body);
    return { snapshot: draft };
  });
});

app.post<{
  Body: {
    venueSlug?: string;
    tableCode?: string;
    cart?: CartLine[];
    clientTotalCents?: number;
    idempotencyKey?: string;
    note?: string;
    alcoholAck?: boolean;
  };
}>("/api/v1/orders", async (request, reply) => {
  const body = request.body ?? {};
  const snapshot = body.venueSlug ? await readSnapshot(publishedDir, body.venueSlug) : null;
  if (!snapshot) return reply.code(404).send({ error: "unknown_venue" });
  const table = snapshot.venue.tables.find((entry) => entry.code === body.tableCode);
  if (!table) return reply.code(400).send({ error: "bad_table" });
  const cart = Array.isArray(body.cart) ? body.cart : [];
  const priced = priceCart(snapshot, cart);
  if (priced.issues.length) {
    const error = priced.issues.includes("sold_out")
      ? "sold_out"
      : priced.issues.includes("empty_cart")
        ? "empty_cart"
        : "bad_cart";
    return reply.code(400).send({ error, issues: priced.issues });
  }
  if (priced.hasAlcohol && body.alcoholAck !== true) return reply.code(400).send({ error: "alcohol_ack" });
  if (body.clientTotalCents !== priced.totalCents) return reply.code(409).send({ error: "price_mismatch", totalCents: priced.totalCents });
  const key = typeof body.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 80) : "";
  if (!key) return reply.code(400).send({ error: "bad_cart" });

  return exclusive(async () => {
    const file = await readOrders();
    const existing = file.idem[key];
    if (existing) {
      const order = file.orders.find((entry) => entry.id === existing.orderId);
      if (order) return { order, duplicate: true };
    }
    file.seq += 1;
    const count = priced.groups.reduce((sum, group) => sum + group.lines.reduce((inner, line) => inner + line.qty, 0), 0) + priced.singles.reduce((sum, line) => sum + line.qty, 0);
    const low = 8 + Math.ceil(count / 6) * 2;
    const order: StoredOrder = {
      id: `M-${file.seq}`,
      venueSlug: snapshot.venue.slug,
      tableCode: table.code,
      tableLabelHe: table.label.he,
      tableLabelEn: table.label.en,
      status: "received",
      paymentMode: "pay_at_table",
      note: (body.note ?? "").slice(0, 180),
      totalCents: priced.totalCents,
      hasPackage: priced.hasPackage,
      groups: priced.groups,
      singles: priced.singles,
      waitMinutes: [low, low + 4],
      createdAt: new Date().toISOString(),
      waiterName: "",
    };
    file.orders.unshift(order);
    file.idem[key] = { orderId: order.id, at: order.createdAt };
    await writeOrders(file);
    broadcast(order.venueSlug, "order", order);
    return reply.code(201).send({ order, duplicate: false });
  });
});

app.get<{ Params: { id: string } }>("/api/v1/orders/:id", async (request, reply) => {
  const file = await readOrders();
  const order = file.orders.find((entry) => entry.id === request.params.id);
  if (!order) return reply.code(404).send({ error: "unknown_order" });
  return { order };
});

app.get<{ Querystring: { venue?: string } }>("/api/v1/staff/orders", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  const file = await readOrders();
  const venue = request.query.venue;
  const orders = venue && venue !== "all" ? file.orders.filter((order) => order.venueSlug === venue) : file.orders;
  return { orders };
});

app.patch<{ Params: { id: string }; Body: { status?: OrderStatus; waiterName?: string } }>("/api/v1/staff/orders/:id", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  const status = request.body?.status;
  if (!status) return reply.code(400).send({ error: "bad_status" });
  return exclusive(async () => {
    const file = await readOrders();
    const order = file.orders.find((entry) => entry.id === request.params.id);
    if (!order) return reply.code(404).send({ error: "unknown_order" });
    if (!allowedNext[order.status].includes(status)) return reply.code(400).send({ error: "bad_status" });
    if (order.status === "received" && status === "accepted") {
      const waiterName = (request.body?.waiterName ?? "").trim().slice(0, 40);
      if (!waiterName) return reply.code(400).send({ error: "waiter_name" });
      order.waiterName = waiterName;
    }
    order.status = status;
    await writeOrders(file);
    broadcast(order.venueSlug, "status", order);
    return { order };
  });
});

app.get<{ Querystring: { token?: string; venue?: string } }>("/api/v1/staff/orders/stream", async (request, reply) => {
  if (!verify(request.query.token)) return reply.code(401).send({ error: "unauthorized" });
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const venue = request.query.venue || "all";
  const listener = {
    venue,
    write: (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
  };
  listeners.add(listener);
  reply.raw.write("event: ready\ndata: {}\n\n");
  const beat = setInterval(() => reply.raw.write(": ping\n\n"), 15000);
  request.raw.on("close", () => {
    clearInterval(beat);
    listeners.delete(listener);
  });
});

function makeTables(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return { code: String(n), label: { he: `שולחן ${n}`, en: `Table ${n}` } };
  });
}

function cleanText(he: unknown, en: unknown, max: number): Text | null {
  if (typeof he !== "string" || typeof en !== "string") return null;
  const left = he.trim().slice(0, max);
  const right = en.trim().slice(0, max);
  if (!left || !right) return null;
  return { he: left, en: right };
}

function uniqueSlug(source: string, taken: Set<string>) {
  const ascii = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const base = ascii || "venue";
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function sanitizeCategories(input: MenuCategory[]): MenuCategory[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 40) return null;
  const ids = new Set<string>();
  const categories: MenuCategory[] = [];
  for (const category of input) {
    if (!category || typeof category.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(category.id) || ids.has(category.id)) return null;
    const name = cleanText(category.name?.he, category.name?.en, 80);
    if (!name || !Number.isInteger(category.sort)) return null;
    ids.add(category.id);
    const next: MenuCategory = { id: category.id, name, sort: category.sort, hidden: Boolean(category.hidden) };
    const note = category.note ? cleanText(category.note.he, category.note.en, 160) : null;
    if (category.note && !note) return null;
    if (note) next.note = note;
    categories.push(next);
  }
  return categories;
}

function sanitizePackages(input: MenuPackage[], itemIds: Set<string>): MenuPackage[] | null {
  if (!Array.isArray(input) || input.length > 12) return null;
  const ids = new Set<string>();
  const packages: MenuPackage[] = [];
  for (const pkg of input) {
    if (!pkg || typeof pkg.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(pkg.id) || ids.has(pkg.id)) return null;
    const name = cleanText(pkg.name?.he, pkg.name?.en, 80);
    const tagline = cleanText(pkg.tagline?.he, pkg.tagline?.en, 180);
    const rules = cleanText(pkg.rules?.he, pkg.rules?.en, 240);
    if (!name || !tagline || !rules) return null;
    if (![pkg.minGuests, pkg.maxGuests, pkg.defaultGuests, pkg.discountPct].every((value) => Number.isInteger(value))) return null;
    if (pkg.minGuests < 1 || pkg.maxGuests > 40 || pkg.minGuests > pkg.maxGuests) return null;
    if (pkg.defaultGuests < pkg.minGuests || pkg.defaultGuests > pkg.maxGuests) return null;
    if (pkg.discountPct < 0 || pkg.discountPct > 90) return null;
    if (!Array.isArray(pkg.components) || pkg.components.length < 1 || pkg.components.length > 8) return null;
    const slots = new Set<string>();
    const components = [];
    for (const component of pkg.components) {
      if (!component || typeof component.slot !== "string" || !/^[a-z0-9-]{1,40}$/.test(component.slot) || slots.has(component.slot)) return null;
      const label = cleanText(component.label?.he, component.label?.en, 80);
      if (!label) return null;
      if (component.mode !== "per_guest" && component.mode !== "per_group_chunk") return null;
      if (!Number.isInteger(component.qty) || component.qty < 1 || component.qty > 8) return null;
      if (!Number.isInteger(component.chunkSize) || component.chunkSize < 1 || component.chunkSize > 20) return null;
      if (!Array.isArray(component.options) || component.options.length < 1 || component.options.length > 12) return null;
      if (component.options.some((id) => typeof id !== "string" || !itemIds.has(id))) return null;
      if (!component.options.includes(component.defaultItemId)) return null;
      slots.add(component.slot);
      components.push({
        slot: component.slot,
        label,
        mode: component.mode,
        chunkSize: component.chunkSize,
        qty: component.qty,
        defaultItemId: component.defaultItemId,
        options: [...component.options],
      });
    }
    ids.add(pkg.id);
    packages.push({
      id: pkg.id,
      name,
      tagline,
      rules,
      minGuests: pkg.minGuests,
      maxGuests: pkg.maxGuests,
      defaultGuests: pkg.defaultGuests,
      discountPct: pkg.discountPct,
      active: pkg.active !== false,
      components,
    });
  }
  return packages;
}

await ensureStore();
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Menuz API on http://127.0.0.1:${PORT}`);
