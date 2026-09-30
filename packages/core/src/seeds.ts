import type { MenuItem, Text, VenueSnapshot } from "./types";

const alcoholNotice: Text = {
  he: "אלכוהול מגיל 18. ייתכן שיבקשו תעודה מזהה.",
  en: "Alcohol is 18+. Staff may ask for ID.",
};

function tables(count = 12) {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return { code: String(n), label: { he: `שולחן ${n}`, en: `Table ${n}` } };
  });
}

function item(partial: MenuItem): MenuItem {
  return partial;
}

const publishedAt = "2026-09-30T09:00:00.000Z";

export const seeds: VenueSnapshot[] = [
  {
    version: 1,
    publishedAt,
    contentNote: {
      he: "שמות ומחירים לפי התפריט הפומבי של דדה, במחיר רגיל ולא מחיר מועדון. זו הצעת תפריט לליד, לא הזמנה חיה.",
      en: "Names and prices follow Deda's public menu, at the regular price rather than the member price. This is a lead menu, not a live order.",
    },
    venue: {
      slug: "deda",
      name: { he: "דדה", en: "Deda" },
      kind: { he: "מסעדה גאורגית", en: "Georgian restaurant" },
      address: { he: "הרצל 75, ראשון לציון", en: "Herzl 75, Rishon LeZion" },
      theme: { bg: "#1a100c", ink: "#f6efe6", muted: "#cbbba8", accent: "#e0b15a", accentInk: "#1a100c", card: "#2a1b14" },
      alcoholNotice,
      tables: tables(),
    },
    categories: [
      { id: "starts", name: { he: "מהשולחן", en: "From the table" }, sort: 1 },
      { id: "breads", name: { he: "חצ׳פורי וחינקלי", en: "Khachapuri and khinkali" }, sort: 2 },
      { id: "stews", name: { he: "תבשילים", en: "Stews" }, sort: 3 },
      { id: "grill", name: { he: "גריל", en: "Grill" }, sort: 4 },
    ],
    items: [
      item({ id: "d_pkhali", categoryId: "starts", name: { he: "פחאלי", en: "Pkhali" }, description: { he: "גלילות חציל באגוזי מלך ופחאלי סלק.", en: "Eggplant rolls with walnuts, and beet pkhali." }, priceCents: 4800, isAlcohol: false, available: true, allergens: ["nuts"], vegetarian: true, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_tbilisi", categoryId: "starts", name: { he: "סלט טביליסי", en: "Tbilisi salad" }, description: { he: "חסה, גמבה, שעועית לבנה, אגוזי מלך וחמוציות.", en: "Lettuce, pepper, white beans, walnuts and cranberries." }, priceCents: 5400, isAlcohol: false, available: true, allergens: ["nuts"], vegetarian: true, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_neli", categoryId: "starts", name: { he: "סלט נלי", en: "Neli salad" }, description: { he: "ירקות העונה, שמן זית, לימון וגבינה בולגרית.", en: "Season vegetables, olive oil, lemon and Bulgarian cheese." }, priceCents: 4900, isAlcohol: false, available: true, allergens: ["milk"], vegetarian: true, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_cheese_balls", categoryId: "starts", name: { he: "כדורי גבינה", en: "Cheese balls" }, description: { he: "כדורי גבינה פריכים עם נענע ושום שמיר.", en: "Crisp cheese balls with mint and garlic-dill." }, priceCents: 3800, isAlcohol: false, available: true, allergens: ["milk", "egg", "gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_lobio", categoryId: "starts", name: { he: "לוביו", en: "Lobio" }, description: { he: "שעועית אדומה, ירק ואגוזי מלך.", en: "Red beans, herbs and walnuts." }, priceCents: 2900, isAlcohol: false, available: true, allergens: ["nuts"], vegetarian: true, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_chips", categoryId: "starts", name: { he: "צ׳יפס", en: "Chips" }, description: { he: "פלחי תפוח אדמה מטוגנים.", en: "Fried potato wedges." }, priceCents: 2500, isAlcohol: false, available: true, allergens: [], vegetarian: true, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_imeruli", categoryId: "breads", name: { he: "חצ׳פורי אימרולי", en: "Imeruli khachapuri" }, description: { he: "מאפה במילוי תערובת גבינות.", en: "Bread filled with a cheese mix." }, priceCents: 5600, isAlcohol: false, available: true, allergens: ["gluten", "milk", "egg"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_megruli", categoryId: "breads", name: { he: "חצ׳פורי מיגרולי", en: "Megruli khachapuri" }, description: { he: "גבינות בפנים ועוד שכבת גבינה מעל.", en: "Cheese inside, and another layer of cheese on top." }, priceCents: 6400, isAlcohol: false, available: true, allergens: ["gluten", "milk", "egg"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_acharuli", categoryId: "breads", name: { he: "חצ׳פורי אג׳רולי", en: "Acharuli khachapuri" }, description: { he: "מאפה סירה עם גבינות וביצת עין.", en: "Boat-shaped bread with cheese and an egg." }, priceCents: 6600, isAlcohol: false, available: true, allergens: ["gluten", "milk", "egg"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_khinkali", categoryId: "breads", name: { he: "חינקלי קלאסי", en: "Classic khinkali" }, description: { he: "חמישה כופתאות במילוי בשר.", en: "Five dumplings filled with meat." }, priceCents: 6400, isAlcohol: false, available: true, allergens: ["gluten"], vegetarian: false, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_khinkali_cheese", categoryId: "breads", name: { he: "חינקלי גבינות", en: "Cheese khinkali" }, description: { he: "חמישה כופתאות במילוי גבינות.", en: "Five dumplings filled with cheese." }, priceCents: 6900, isAlcohol: false, available: true, allergens: ["gluten", "milk"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_chiburiki", categoryId: "breads", name: { he: "צ׳יבוריקי", en: "Chiburekki" }, description: { he: "מאפה קריספי במילוי בשר עגל. שתי יחידות.", en: "Crisp pastries filled with veal. Two pieces." }, priceCents: 5200, isAlcohol: false, available: true, allergens: ["gluten"], vegetarian: false, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_kharcho", categoryId: "stews", name: { he: "חרצ׳ו", en: "Kharcho" }, description: { he: "בשר עגל, אורז ואגוזי מלך. מוגש עם לבש.", en: "Veal, rice and walnuts. Served with lavash." }, priceCents: 4900, isAlcohol: false, available: true, allergens: ["nuts", "gluten"], vegetarian: false, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_chakhokhbili", categoryId: "stews", name: { he: "צ׳חוחבילי", en: "Chakhokhbili" }, description: { he: "סטייק פרגית ברוטב עגבניות קלויות, עם אורז.", en: "Chicken steak in roasted tomato sauce, with rice." }, priceCents: 6700, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_ojakhuri", categoryId: "grill", name: { he: "אוג׳חורי", en: "Ojakhuri" }, description: { he: "בשר עגל, בצל מטוגן ותפוח אדמה על לבש.", en: "Veal, fried onion and potato on lavash." }, priceCents: 8500, isAlcohol: false, available: true, allergens: ["gluten"], vegetarian: false, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "d_kebab", categoryId: "grill", name: { he: "קבב של דדה", en: "Deda kebab" }, description: { he: "קבב במתכון גאורגי, עם שעועית ירוקה וצ׳יפס.", en: "Georgian-recipe kebab, with green beans and chips." }, priceCents: 8400, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_board_2", categoryId: "grill", name: { he: "פלטת בשרים לזוג", en: "Grill board for two" }, description: { he: "פרגית, קבב, שיפוד פילה עגל וצלעות טלה. כ־600 גרם.", en: "Chicken, kebab, veal fillet skewer and lamb ribs. About 600 g." }, priceCents: 22000, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "public-menu" }),
      item({ id: "d_board_4", categoryId: "grill", name: { he: "פלטת בשרים לרביעייה", en: "Grill board for four" }, description: { he: "פרגית, קבב, שיפוד פילה עגל וצלעות טלה. כ־1200 גרם.", en: "Chicken, kebab, veal fillet skewer and lamb ribs. About 1.2 kg." }, priceCents: 41000, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "public-menu" }),
    ],
    packages: [
      {
        id: "supra",
        name: { he: "סופרה", en: "Supra" },
        tagline: { he: "חצ׳פורי לכל אחד, חינקלי ופלטת גריל לשולחן.", en: "Khachapuri each, khinkali and a grill board for the table." },
        rules: { he: "חצ׳פורי אחד לאדם, ומנת חינקלי ופלטה אחת לכל ארבעה.", en: "One khachapuri per person, plus one khinkali and one board for every four people." },
        minGuests: 2,
        maxGuests: 12,
        defaultGuests: 4,
        discountPct: 8,
        components: [
          { slot: "bread", label: { he: "חצ׳פורי לכל אחד", en: "Khachapuri each" }, mode: "per_guest", chunkSize: 1, qty: 1, defaultItemId: "d_imeruli", options: ["d_imeruli", "d_megruli", "d_acharuli"] },
          { slot: "khinkali", label: { he: "חינקלי לשולחן", en: "Khinkali for the table" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "d_khinkali", options: ["d_khinkali", "d_khinkali_cheese"] },
          { slot: "board", label: { he: "פלטת גריל", en: "Grill board" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "d_board_4", options: ["d_board_4", "d_board_2"] },
        ],
      },
    ],
  },
  {
    version: 1,
    publishedAt,
    contentNote: {
      he: "אין תפריט פומבי מלא לשף עידן הלפרין. המנות כאן הן הדגמה בסגנון המקום לפי הכרטיס, לא התפריט האמיתי.",
      en: "Chef Idan Halperin has no full public menu. These dishes are a demo in the style of the place, not the real menu.",
    },
    venue: {
      slug: "idan-halperin",
      name: { he: "שף עידן הלפרין", en: "Chef Idan Halperin" },
      kind: { he: "חוויה קולינרית", en: "Culinary experience" },
      address: { he: "מוצקין 5, ראשון לציון", en: "Motzkin 5, Rishon LeZion" },
      theme: { bg: "#121316", ink: "#f4f1ea", muted: "#b7b3aa", accent: "#d7c4a3", accentInk: "#1a1814", card: "#1d1e24" },
      alcoholNotice,
      tables: tables(8),
    },
    categories: [
      { id: "open", name: { he: "פתיחה", en: "To start" }, sort: 1 },
      { id: "main", name: { he: "עיקרית", en: "Main" }, sort: 2 },
      { id: "end", name: { he: "סיום", en: "To finish" }, sort: 3 },
    ],
    items: [
      item({ id: "c_bread", categoryId: "open", name: { he: "לחם השף ומטבלים", en: "Chef's bread and dips" }, description: { he: "מנת הדגמה. לחם חם ושני מטבלים לשולחן.", en: "Demo dish. Warm bread and two dips for the table." }, priceCents: 3600, isAlcohol: false, available: true, allergens: ["gluten", "sesame"], vegetarian: true, glutenFree: false, priceSource: "demo" }),
      item({ id: "c_veg", categoryId: "open", name: { he: "ירק העונה", en: "Season vegetable" }, description: { he: "מנת הדגמה. ירק צלוי, לא מנה מתוך תפריט שפורסם.", en: "Demo dish. A roasted vegetable, not from a published menu." }, priceCents: 6400, isAlcohol: false, available: true, allergens: ["nuts"], vegetarian: true, glutenFree: true, priceSource: "demo" }),
      item({ id: "c_fish", categoryId: "main", name: { he: "דג היום", en: "Fish of the day" }, description: { he: "מנת הדגמה. דג שלם קצר בישול.", en: "Demo dish. A short-cooked whole fish." }, priceCents: 12800, isAlcohol: false, available: true, allergens: ["fish"], vegetarian: false, glutenFree: true, priceSource: "demo" }),
      item({ id: "c_meat", categoryId: "main", name: { he: "בשר היום", en: "Meat of the day" }, description: { he: "מנת הדגמה. נתח בקר ואש צלויה.", en: "Demo dish. A cut of beef and charred allium." }, priceCents: 14800, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "demo" }),
      item({ id: "c_sweet", categoryId: "end", name: { he: "קינוח השף", en: "Chef's dessert" }, description: { he: "מנת הדגמה. קינוח אחד, משתנה בערב.", en: "Demo dish. One dessert, and it changes in the evening." }, priceCents: 4800, isAlcohol: false, available: true, allergens: ["milk", "egg", "gluten"], vegetarian: true, glutenFree: false, priceSource: "demo" }),
      item({ id: "c_fruit", categoryId: "end", name: { he: "פירות קלויים", en: "Roasted fruit" }, description: { he: "מנת הדגמה. פרי העונה, בלי חלב.", en: "Demo dish. Seasonal fruit, without milk." }, priceCents: 4200, isAlcohol: false, available: true, allergens: [], vegetarian: true, glutenFree: true, priceSource: "demo" }),
    ],
    packages: [
      {
        id: "chef-table",
        name: { he: "שולחן השף", en: "The chef's table" },
        tagline: { he: "עיקרית לכל אחד, לחם וירק לשולחן, קינוח לכל אחד.", en: "A main each, bread and a vegetable for the table, dessert each." },
        rules: { he: "עיקרית וקינוח לאדם. לחם וירק אחד לכל ארבעה.", en: "A main and a dessert per person. One bread and one vegetable for every four people." },
        minGuests: 2,
        maxGuests: 8,
        defaultGuests: 4,
        discountPct: 0,
        components: [
          { slot: "main", label: { he: "עיקרית לכל אחד", en: "Main each" }, mode: "per_guest", chunkSize: 1, qty: 1, defaultItemId: "c_fish", options: ["c_fish", "c_meat"] },
          { slot: "bread", label: { he: "לחם לשולחן", en: "Bread for the table" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "c_bread", options: ["c_bread"] },
          { slot: "veg", label: { he: "ירק לשולחן", en: "Vegetable for the table" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "c_veg", options: ["c_veg"] },
          { slot: "sweet", label: { he: "קינוח לכל אחד", en: "Dessert each" }, mode: "per_guest", chunkSize: 1, qty: 1, defaultItemId: "c_sweet", options: ["c_sweet", "c_fruit"] },
        ],
      },
    ],
  },
  {
    version: 1,
    publishedAt,
    contentNote: {
      he: "שמות הבירות והמחירים לפי מחירון הבקבוקים באתר Beer Time. מנות האוכל מסומנות כהערכת ליד, אין להן מחירון שולחן פומבי שמצאנו.",
      en: "Beer names and prices follow the bottle list on the Beer Time site. Food dishes are marked as lead estimates. We did not find a published table menu for them.",
    },
    venue: {
      slug: "beer-time",
      name: { he: "BEER TIME", en: "BEER TIME" },
      kind: { he: "ביר הול", en: "Beer hall" },
      address: { he: "הרצל 47, ראשון לציון", en: "Herzl 47, Rishon LeZion" },
      theme: { bg: "#12140c", ink: "#f4f1e4", muted: "#c2bda6", accent: "#e2a322", accentInk: "#1a1408", card: "#1e2214" },
      alcoholNotice,
      tables: tables(),
    },
    categories: [
      { id: "beer", name: { he: "בירות", en: "Beer" }, sort: 1 },
      { id: "snacks", name: { he: "לשולחן", en: "For the table" }, sort: 2 },
    ],
    items: [
      item({ id: "bt_lowen", categoryId: "beer", name: { he: "לובנבראו", en: "Löwenbräu" }, description: { he: "בקבוק ממחירון האתר.", en: "Bottle from the site price list." }, priceCents: 5400, isAlcohol: true, available: true, allergens: ["gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "bt_cesu", categoryId: "beer", name: { he: "צ׳סו בוהמיין", en: "Cesu Bohemian" }, description: { he: "בקבוק ממחירון האתר.", en: "Bottle from the site price list." }, priceCents: 5600, isAlcohol: true, available: true, allergens: ["gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "bt_stiegl", categoryId: "beer", name: { he: "שטיגל אשכולית", en: "Stiegl Grapefruit" }, description: { he: "בקבוק ממחירון האתר.", en: "Bottle from the site price list." }, priceCents: 5900, isAlcohol: true, available: true, allergens: ["gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "bt_hof", categoryId: "beer", name: { he: "הופברוי", en: "Hofbräu" }, description: { he: "בקבוק ממחירון האתר.", en: "Bottle from the site price list." }, priceCents: 6900, isAlcohol: true, available: true, allergens: ["gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "bt_hazy", categoryId: "beer", name: { he: "הייזי קווין", en: "Hazy Queen" }, description: { he: "בקבוק ממחירון האתר.", en: "Bottle from the site price list." }, priceCents: 7500, isAlcohol: true, available: true, allergens: ["gluten"], vegetarian: true, glutenFree: false, priceSource: "public-menu" }),
      item({ id: "bt_chips", categoryId: "snacks", name: { he: "קערת צ׳יפס", en: "Chips bowl" }, description: { he: "הערכת מחיר לליד. אין מחירון שולחן פומבי.", en: "Lead estimate. No published table price." }, priceCents: 3200, isAlcohol: false, available: true, allergens: [], vegetarian: true, glutenFree: true, priceSource: "lead-estimate" }),
      item({ id: "bt_cheese", categoryId: "snacks", name: { he: "פלטת גבינות", en: "Cheese board" }, description: { he: "הערכת מחיר לליד, לשלושה עד ארבעה.", en: "Lead estimate, for three to four people." }, priceCents: 7800, isAlcohol: false, available: true, allergens: ["milk"], vegetarian: true, glutenFree: true, priceSource: "lead-estimate" }),
      item({ id: "bt_meat", categoryId: "snacks", name: { he: "פלטת בשרים", en: "Meat board" }, description: { he: "הערכת מחיר לליד, לשלושה עד ארבעה.", en: "Lead estimate, for three to four people." }, priceCents: 9600, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "lead-estimate" }),
      item({ id: "bt_wings", categoryId: "snacks", name: { he: "כנפיים", en: "Wings" }, description: { he: "הערכת מחיר לליד. מנת שיתוף.", en: "Lead estimate. A sharing dish." }, priceCents: 7200, isAlcohol: false, available: true, allergens: [], vegetarian: false, glutenFree: true, priceSource: "lead-estimate" }),
    ],
    packages: [
      {
        id: "round",
        name: { he: "הסיבוב", en: "The Round" },
        tagline: { he: "בירה לכל אחד, צ׳יפס ופלטה לשולחן.", en: "A beer each, chips and a board for the table." },
        rules: { he: "בירה אחת לאדם, וקערת צ׳יפס ופלטה אחת לכל ארבעה.", en: "One beer per person, plus one chips bowl and one board for every four people." },
        minGuests: 2,
        maxGuests: 12,
        defaultGuests: 4,
        discountPct: 10,
        components: [
          { slot: "drink", label: { he: "בירה לכל אחד", en: "Beer each" }, mode: "per_guest", chunkSize: 1, qty: 1, defaultItemId: "bt_lowen", options: ["bt_lowen", "bt_cesu", "bt_stiegl", "bt_hof", "bt_hazy"] },
          { slot: "chips", label: { he: "צ׳יפס לשולחן", en: "Chips for the table" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "bt_chips", options: ["bt_chips"] },
          { slot: "platter", label: { he: "פלטה לשולחן", en: "Board for the table" }, mode: "per_group_chunk", chunkSize: 4, qty: 1, defaultItemId: "bt_cheese", options: ["bt_cheese", "bt_meat", "bt_wings"] },
        ],
      },
    ],
  },
];
