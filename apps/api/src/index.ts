import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import {
  priceCart,
  seeds,
  type CartLine,
  type OrderStatus,
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
    const published = path.join(publishedDir, `${seed.venue.slug}.json`);
    const draft = path.join(draftDir, `${seed.venue.slug}.json`);
    try {
      await readFile(published, "utf8");
    } catch {
      await writeFile(published, JSON.stringify(seed, null, 2));
    }
    try {
      await readFile(draft, "utf8");
    } catch {
      await writeFile(draft, JSON.stringify(seed, null, 2));
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

app.get("/api/v1/venues", async () => {
  const list = [];
  for (const seed of seeds) {
    const snapshot = await readSnapshot(publishedDir, seed.venue.slug);
    if (!snapshot) continue;
    list.push({
      slug: snapshot.venue.slug,
      name: snapshot.venue.name,
      kind: snapshot.venue.kind,
      address: snapshot.venue.address,
      theme: snapshot.venue.theme,
      version: snapshot.version,
    });
  }
  return { venues: list };
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

app.put<{
  Params: { slug: string };
  Body: { items?: { id: string; priceCents: number; available: boolean }[] };
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

app.patch<{ Params: { id: string }; Body: { status?: OrderStatus } }>("/api/v1/staff/orders/:id", async (request, reply) => {
  if (!verify(tokenFrom(request))) return reply.code(401).send({ error: "unauthorized" });
  const status = request.body?.status;
  if (!status) return reply.code(400).send({ error: "bad_status" });
  return exclusive(async () => {
    const file = await readOrders();
    const order = file.orders.find((entry) => entry.id === request.params.id);
    if (!order) return reply.code(404).send({ error: "unknown_order" });
    if (!allowedNext[order.status].includes(status)) return reply.code(400).send({ error: "bad_status" });
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

await ensureStore();
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Menuz API on http://127.0.0.1:${PORT}`);
