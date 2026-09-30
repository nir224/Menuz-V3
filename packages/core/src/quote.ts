import type {
  CartLine,
  IssueCode,
  MenuItem,
  MenuPackage,
  PricedCart,
  PricedLine,
  VenueSnapshot,
} from "./types";

export function itemMap(snapshot: VenueSnapshot): Map<string, MenuItem> {
  return new Map(snapshot.items.map((item) => [item.id, item]));
}

export function packageQty(component: MenuPackage["components"][number], guests: number): number {
  if (component.mode === "per_guest") return guests * component.qty;
  const chunk = Math.max(1, component.chunkSize);
  return Math.ceil(guests / chunk) * component.qty;
}

export function textOf(value: { he: string; en: string }, lang: "he" | "en"): string {
  return value[lang] || value.he;
}

export function formatIls(cents: number, lang: "he" | "en"): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const digits = abs % 100 === 0 ? 0 : 2;
  const number = new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(abs / 100);
  const body = lang === "he" ? `${number} ש״ח` : `NIS ${number}`;
  if (!negative) return body;
  return lang === "he" ? `${number}− ש״ח` : `−${body}`;
}

export function priceCart(snapshot: VenueSnapshot, cart: CartLine[]): PricedCart {
  const items = itemMap(snapshot);
  const packages = new Map(snapshot.packages.map((pkg) => [pkg.id, pkg]));
  const issues: IssueCode[] = [];
  const groups: PricedCart["groups"] = [];
  const singles: PricedLine[] = [];
  let totalCents = 0;
  let hasAlcohol = false;
  let hasPackage = false;

  if (!cart.length) issues.push("empty_cart");

  for (const line of cart) {
    if (line.type === "item") {
      const item = items.get(line.itemId);
      if (!item) {
        issues.push("unknown_item");
        continue;
      }
      if (!item.available) issues.push("sold_out");
      const category = snapshot.categories.find((entry) => entry.id === item.categoryId);
      if (category?.hidden) {
        issues.push("unknown_item");
        continue;
      }
      const qty = line.qty;
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        issues.push("bad_qty");
        continue;
      }
      const total = item.priceCents * qty;
      totalCents += total;
      if (item.isAlcohol) hasAlcohol = true;
      singles.push({
        slot: null,
        itemId: item.id,
        name: item.name,
        qty,
        unitCents: item.priceCents,
        totalCents: total,
      });
      continue;
    }

    const pkg = packages.get(line.packageId);
    if (!pkg || pkg.active === false) {
      issues.push("unknown_package");
      continue;
    }
    if (!Number.isInteger(line.guests) || line.guests < pkg.minGuests || line.guests > pkg.maxGuests) {
      issues.push("bad_guests");
      continue;
    }
    const priced: PricedLine[] = [];
    let subtotal = 0;
    let blocked = false;
    for (const component of pkg.components) {
      const itemId = line.selection[component.slot] || component.defaultItemId;
      if (!component.options.includes(itemId)) {
        issues.push("bad_swap");
        blocked = true;
        continue;
      }
      const item = items.get(itemId);
      if (!item) {
        issues.push("unknown_item");
        blocked = true;
        continue;
      }
      if (!item.available) issues.push("sold_out");
      const qty = packageQty(component, line.guests);
      const total = item.priceCents * qty;
      subtotal += total;
      if (item.isAlcohol) hasAlcohol = true;
      priced.push({
        slot: component.slot,
        itemId: item.id,
        name: item.name,
        qty,
        unitCents: item.priceCents,
        totalCents: total,
      });
    }
    if (blocked) continue;
    const discount = Math.round((subtotal * pkg.discountPct) / 100);
    const total = subtotal - discount;
    totalCents += total;
    hasPackage = true;
    groups.push({
      packageId: pkg.id,
      name: pkg.name,
      guests: line.guests,
      totalCents: total,
      lines: priced,
    });
  }

  return {
    totalCents,
    issues: [...new Set(issues)],
    hasAlcohol,
    hasPackage,
    groups,
    singles,
  };
}

export function previewPackage(
  snapshot: VenueSnapshot,
  pkg: MenuPackage,
  guests: number,
  selection: Record<string, string>,
) {
  const priced = priceCart(snapshot, [
    { type: "package", packageId: pkg.id, guests, selection },
  ]);
  const group = priced.groups[0];
  const subtotal = group ? group.lines.reduce((sum, line) => sum + line.totalCents, 0) : 0;
  const discountCents = group ? subtotal - group.totalCents : 0;
  return {
    lines: group?.lines ?? [],
    subtotalCents: subtotal,
    discountCents,
    totalCents: group?.totalCents ?? 0,
    perPersonCents: guests > 0 && group ? Math.round(group.totalCents / guests) : 0,
    issues: priced.issues.filter((issue) => issue !== "empty_cart"),
    hasAlcohol: priced.hasAlcohol,
  };
}
