import assert from "node:assert/strict";
import { priceCart, packageQty } from "./quote";
import { seeds } from "./seeds";

const beer = seeds.find((venue) => venue.venue.slug === "beer-time");
assert.ok(beer);

const round = beer.packages[0];
const drink = round.components.find((component) => component.slot === "drink");
const platter = round.components.find((component) => component.slot === "platter");
assert.ok(drink && platter);
assert.equal(packageQty(drink, 6), 6);
assert.equal(packageQty(platter, 4), 1);
assert.equal(packageQty(platter, 5), 2);

const priced = priceCart(beer, [
  {
    type: "package",
    packageId: round.id,
    guests: 4,
    selection: {
      drink: "bt_lowen",
      chips: "bt_chips",
      platter: "bt_cheese",
    },
  },
]);

assert.deepEqual(priced.issues, []);
assert.equal(priced.hasPackage, true);
assert.equal(priced.hasAlcohol, true);
const subtotal = 5400 * 4 + 3200 + 7800;
const expected = subtotal - Math.round(subtotal * 0.1);
assert.equal(priced.totalCents, expected);

const tampered = priceCart(beer, [
  {
    type: "package",
    packageId: round.id,
    guests: 4,
    selection: { drink: "not-a-beer", chips: "bt_chips", platter: "bt_cheese" },
  },
]);
assert.ok(tampered.issues.includes("bad_swap"));

console.log("quote tests passed");
