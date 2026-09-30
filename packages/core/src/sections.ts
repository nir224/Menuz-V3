import type { MenuCategory, Text } from "./types";

/** Starter sections for a new business. Admins can rename, hide, reorder, and add more. */
export const basicSections: { id: string; name: Text }[] = [
  { id: "starters", name: { he: "מנות ראשונות", en: "Starters" } },
  { id: "salads", name: { he: "סלטים", en: "Salads" } },
  { id: "mains", name: { he: "עיקריות", en: "Mains" } },
  { id: "burgers", name: { he: "המבורגרים", en: "Burgers" } },
  { id: "soft", name: { he: "שתייה קלה", en: "Soft drinks" } },
  { id: "beer", name: { he: "בירה", en: "Beer" } },
  { id: "cocktails", name: { he: "קוקטיילים", en: "Cocktails" } },
  { id: "wine", name: { he: "יין", en: "Wine" } },
  { id: "desserts", name: { he: "קינוחים", en: "Desserts" } },
  { id: "kids", name: { he: "ילדים", en: "Kids" } },
];

export function basicCategories(): MenuCategory[] {
  return basicSections.map((section, index) => ({
    id: section.id,
    name: { ...section.name },
    sort: index + 1,
    hidden: false,
  }));
}
