import assert from "node:assert/strict";
import { test } from "node:test";
import { INDIA, US_PRICE, cleanAmount, countryOf, currencyFor, exponentOf, formatMinor, formatMoney, inrPaiseOf, marketFor, minorUnits, priceIn } from "../src/lib/pricing";

const RATES = { INR: 1, USD: 0.0112, EUR: 0.0105, GBP: 0.0089, PKR: 3.157, JPY: 1.74, KWD: 0.00344, IDR: 185.2 };

test("India pays INR and the US always pays $20", () => {
  assert.deepEqual(marketFor("in", RATES), INDIA);
  const us = marketFor("US", RATES)!;
  assert.equal(us.currency, "USD");
  assert.equal(priceIn(us, 1999), US_PRICE);
  assert.equal(priceIn(us, 499), US_PRICE, "the offer doesn't change the US price");
  assert.equal(priceIn(us, 1), US_PRICE, "nor does a coupon");
  assert.equal(marketFor("US", null)?.fixed, US_PRICE, "the US price needs no rate");
});

test("everyone else pays today's conversion, in their own currency", () => {
  assert.equal(priceIn(marketFor("DE", RATES)!, 1999), 21);
  assert.equal(priceIn(marketFor("GB", RATES)!, 1999), 18);
  assert.equal(priceIn(marketFor("PK", RATES)!, 1999), 6310);
  assert.equal(priceIn(marketFor("JP", RATES)!, 1999), 3480);
  assert.equal(priceIn(marketFor("KW", RATES)!, 1999), 6.9);
  assert.equal(priceIn(marketFor("ID", RATES)!, 1999), 370000);
});

test("an unknown country, or a currency with no rate or no Razorpay support, pays converted US dollars", () => {
  for (const country of [null, "XX", "AR", "FR-ish"]) assert.equal(marketFor(country, RATES)?.currency, "USD", String(country));
  assert.equal(marketFor("CA", RATES)?.currency, "USD", "no CAD rate today");
  assert.equal(currencyFor("AR"), "USD", "Razorpay can't charge ARS");
  assert.equal(currencyFor("ca"), "CAD");
  assert.equal(currencyFor("IE"), "EUR");
  assert.equal(priceIn(marketFor("AR", RATES)!, 1999), 22);
});

test("with no rates at all, the caller charges INR", () => {
  assert.equal(marketFor("DE", null), null);
  assert.equal(marketFor("DE", { INR: 1 }), null);
});

test("amounts round to a clean figure in the currency's own units", () => {
  assert.equal(cleanAmount(20.87, "EUR"), 21);
  assert.equal(cleanAmount(4.36, "GBP"), 4.4);
  assert.equal(cleanAmount(4.36, "JPY"), 4, "no fractions of a yen");
  assert.equal(cleanAmount(6312.4, "PKR"), 6310);
  assert.equal(cleanAmount(33456, "KRW"), 33500);
  assert.equal(cleanAmount(999.6, "USD"), 1000);
});

test("Razorpay's smallest units, and the INR they're worth", () => {
  assert.equal(exponentOf("USD"), 2);
  assert.equal(exponentOf("JPY"), 0);
  assert.equal(exponentOf("KWD"), 3);
  assert.equal(minorUnits(20, "USD"), 2000);
  assert.equal(minorUnits(3480, "JPY"), 3480);
  assert.equal(minorUnits(6.9, "KWD"), 6900);
  assert.equal(minorUnits(4.4, "GBP"), 440);
  assert.equal(inrPaiseOf(199900, "INR", 1), 199900);
  assert.equal(inrPaiseOf(2000, "USD", 0.0112), 178571);
  assert.equal(inrPaiseOf(2000, "USD", null), null);
});

test("prices read the way buyers expect", () => {
  assert.equal(formatMoney(1999, "INR"), "₹1,999");
  assert.equal(formatMoney(20, "USD"), "$20");
  assert.equal(formatMoney(21, "EUR"), "€21");
  assert.equal(formatMoney(4.4, "GBP"), "£4.40");
  assert.equal(formatMoney(6310, "PKR"), "PKR\u00a06,310", "a no-break space, so it never wraps");
  assert.equal(formatMinor(49900, "INR"), "₹499");
  assert.equal(formatMinor(6900, "KWD"), "KWD\u00a06.900");
});

test("country codes are cleaned", () => {
  assert.equal(countryOf(" us "), "US");
  assert.equal(countryOf("XX"), null);
  assert.equal(countryOf("USA"), null);
  assert.equal(countryOf(7), null);
});
