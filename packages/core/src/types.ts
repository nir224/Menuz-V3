export type Lang = "he" | "en";

export type Text = { he: string; en: string };

export type Allergen =
  | "gluten"
  | "milk"
  | "peanuts"
  | "nuts"
  | "sesame"
  | "sulphites"
  | "egg"
  | "fish"
  | "soy";

export type PriceSource = "public-menu" | "lead-estimate" | "demo";

export type MenuItem = {
  id: string;
  categoryId: string;
  name: Text;
  description: Text;
  priceCents: number;
  isAlcohol: boolean;
  available: boolean;
  allergens: Allergen[];
  vegetarian: boolean;
  glutenFree: boolean;
  priceSource: PriceSource;
  image?: string;
};

export type PackageComponent = {
  slot: string;
  label: Text;
  mode: "per_guest" | "per_group_chunk";
  chunkSize: number;
  qty: number;
  defaultItemId: string;
  options: string[];
};

export type MenuPackage = {
  id: string;
  name: Text;
  tagline: Text;
  rules: Text;
  minGuests: number;
  maxGuests: number;
  defaultGuests: number;
  discountPct: number;
  /** Missing means active, so older snapshots stay on the guest menu. */
  active?: boolean;
  components: PackageComponent[];
};

export type MenuCategory = {
  id: string;
  name: Text;
  sort: number;
  hidden?: boolean;
  note?: Text;
};

export type VenueTheme = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  card: string;
};

export type VenueSkin = "cards" | "wood";

export type VenueSnapshot = {
  version: number;
  publishedAt: string;
  /** Bumped when the checked-in sample menu changes. Local edits with a higher version are kept. */
  seedKey?: string;
  contentNote: Text;
  venue: {
    slug: string;
    name: Text;
    kind: Text;
    address: Text;
    theme: VenueTheme;
    alcoholNotice: Text;
    tables: { code: string; label: Text }[];
    blurb?: Text;
    hero?: string;
    skin?: VenueSkin;
    homeSort?: number;
  };
  categories: MenuCategory[];
  items: MenuItem[];
  packages: MenuPackage[];
};

export type CartLine =
  | {
      type: "package";
      packageId: string;
      guests: number;
      selection: Record<string, string>;
    }
  | { type: "item"; itemId: string; qty: number };

export type OrderStatus = "received" | "accepted" | "ready" | "served" | "void";

export type PricedLine = {
  slot: string | null;
  itemId: string;
  name: Text;
  qty: number;
  unitCents: number;
  totalCents: number;
};

export type PricedGroup = {
  packageId: string;
  name: Text;
  guests: number;
  totalCents: number;
  lines: PricedLine[];
};

export type IssueCode =
  | "unknown_item"
  | "unknown_package"
  | "sold_out"
  | "bad_guests"
  | "bad_swap"
  | "bad_qty"
  | "empty_cart";

export type PricedCart = {
  totalCents: number;
  issues: IssueCode[];
  hasAlcohol: boolean;
  hasPackage: boolean;
  groups: PricedGroup[];
  singles: PricedLine[];
};
