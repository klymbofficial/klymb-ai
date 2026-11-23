/**
 * What a buyer pays, in their own currency. India pays the INR price; the US
 * pays a flat $20, whatever the INR price is; everyone else pays the INR price
 * converted at today's rate into their own currency, rounded to a clean
 * figure. A country we can't tell, or a currency Razorpay can't charge, pays
 * converted US dollars. Pure and safe in the browser: the page, the order and
 * the emails all price with this, so they can't disagree.
 */

export interface Market {
  /** The buyer's two-letter country, upper case, or null when it couldn't be told. */
  country: string | null;
  currency: string;
  /** What 1 INR is worth in `currency` today. 1 for INR; null when no rate is known (the US price needs none). */
  rate: number | null;
  /** A set price in `currency` that replaces conversion, or null. */
  fixed: number | null;
}

export const INDIA: Market = { country: "IN", currency: "INR", rate: 1, fixed: null };

/** System Design in the US: always $20, through offers and coupons. */
export const US_PRICE = 20;

/** Currencies Razorpay can charge (its International Payments list). */
const RAZORPAY = new Set(
  ("AED ALL AMD AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BZD CAD CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ETB EUR FJD GBP GHS GIP " +
    "GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD ISK JMD JOD JPY KES KGS KHR KMF KRW KWD KYD KZT LAK LKR LRD LSL MAD MDL MGA MKD MMK MNT MOP MUR MVR MWK MXN " +
    "MYR MZN NAD NGN NIO NOK NPR NZD OMR PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SCR SEK SGD SLL SOS SVC SZL THB TND TRY TTD TWD TZS UAH UGX USD UYU UZS VND " +
    "VUV XAF XCD XOF XPF YER ZAR ZMW").split(" "),
);

/** Currencies with no minor unit, and with three: Razorpay's amount is in that unit. */
const ZERO_DECIMAL = new Set("BIF CLP DJF GNF ISK JPY KMF KRW PYG RWF UGX VND VUV XAF XOF XPF".split(" "));
const THREE_DECIMAL = new Set("BHD IQD JOD KWD OMR TND".split(" "));

/** Countries that share a currency, then each country with its own. Anywhere missing pays USD. */
const SHARED: Record<string, string> = {
  EUR: "AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK",
  GBP: "GB IM JE GG",
  CHF: "CH LI",
  DKK: "DK GL FO",
  XAF: "CM CF TD CG GQ GA",
  XOF: "BJ BF CI GW ML NE SN TG",
  XPF: "NC PF WF",
  XCD: "AG DM GD KN LC VC AI MS",
};
const OWN =
  "AE:AED AL:ALL AM:AMD AU:AUD AW:AWG AZ:AZN BA:BAM BB:BBD BD:BDT BG:BGN BH:BHD BI:BIF BM:BMD BN:BND BO:BOB BR:BRL BS:BSD BT:BTN BW:BWP BZ:BZD CA:CAD " +
  "CL:CLP CN:CNY CO:COP CR:CRC CV:CVE CZ:CZK DJ:DJF DO:DOP DZ:DZD EG:EGP ET:ETB FJ:FJD GH:GHS GI:GIP GM:GMD GN:GNF GT:GTQ GY:GYD HK:HKD HN:HNL " +
  "HT:HTG HU:HUF ID:IDR IL:ILS IQ:IQD IS:ISK JM:JMD JO:JOD JP:JPY KE:KES KG:KGS KH:KHR KM:KMF KR:KRW KW:KWD KY:KYD KZ:KZT LA:LAK LK:LKR LR:LRD LS:LSL " +
  "MA:MAD MD:MDL MG:MGA MK:MKD MM:MMK MN:MNT MO:MOP MU:MUR MV:MVR MW:MWK MX:MXN MY:MYR MZ:MZN NA:NAD NG:NGN NI:NIO NO:NOK NP:NPR NZ:NZD OM:OMR PE:PEN " +
  "PG:PGK PH:PHP PK:PKR PL:PLN PY:PYG QA:QAR RO:RON RS:RSD RW:RWF SA:SAR SC:SCR SE:SEK SG:SGD SO:SOS SZ:SZL TH:THB TN:TND TR:TRY TT:TTD TW:TWD " +
  "TZ:TZS UA:UAH UG:UGX UY:UYU UZ:UZS VN:VND VU:VUV YE:YER ZA:ZAR ZM:ZMW";

const CURRENCY_OF: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SHARED).flatMap(([currency, countries]) => countries.split(" ").map((c) => [c, currency]))),
  ...Object.fromEntries(OWN.split(" ").map((pair) => pair.split(":"))),
};

/** A two-letter country code, upper case, or null when it isn't one. */
export function countryOf(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** The currency a buyer in `country` pays in. */
export function currencyFor(country: string | null | undefined) {
  const code = countryOf(country);
  if (code === "IN") return "INR";
  if (code === "US") return "USD";
  const currency = code ? CURRENCY_OF[code] : undefined;
  return currency && RAZORPAY.has(currency) ? currency : "USD";
}

/** Digits after the point in `currency`'s smallest unit, as Razorpay counts them. */
export const exponentOf = (currency: string) => (ZERO_DECIMAL.has(currency) ? 0 : THREE_DECIMAL.has(currency) ? 3 : 2);

/**
 * Where this buyer pays, from their country and today's rates (1 INR in each
 * currency). A currency with no rate today falls back to USD; with no USD
 * rate either, this is null and the caller charges INR.
 */
export function marketFor(country: string | null | undefined, rates: Record<string, number> | null): Market | null {
  const code = countryOf(country);
  if (code === "IN") return INDIA;
  const rateOf = (c: string) => (typeof rates?.[c] === "number" && rates[c] > 0 ? rates[c] : null);
  if (code === "US") return { country: code, currency: "USD", rate: rateOf("USD"), fixed: US_PRICE };
  const currency = currencyFor(code);
  if (rateOf(currency)) return { country: code, currency, rate: rateOf(currency), fixed: null };
  return rateOf("USD") ? { country: code, currency: "USD", rate: rateOf("USD"), fixed: null } : null;
}

/** A converted amount, rounded so it reads as a price: tenths under 10, whole units to 1,000, three significant figures above. */
export function cleanAmount(value: number, currency: string) {
  const raw = value < 10 ? 0.1 : value < 1000 ? 1 : 10 ** (Math.floor(Math.log10(value)) - 2);
  const step = Math.max(raw, 10 ** -exponentOf(currency));
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/** What an INR price costs in this market, in its own currency: 21 for €21. */
export function priceIn(market: Market, inr: number) {
  if (market.fixed !== null) return market.fixed;
  if (market.currency === "INR" || market.rate === null) return inr;
  return cleanAmount(inr * market.rate, market.currency);
}

/** An amount in Razorpay's smallest unit: cents, fils, yen. */
export const minorUnits = (amount: number, currency: string) => Math.round(amount * 10 ** exponentOf(currency));

/** What a charge in `currency` (in its smallest unit) is worth in INR paise at `rate`, or null when unknown. */
export function inrPaiseOf(minor: number, currency: string, rate: number | null) {
  if (currency === "INR") return minor;
  return rate ? Math.round((minor / 10 ** exponentOf(currency) / rate) * 100) : null;
}

/** "₹1,999", "$20", "€21", "PKR 6,310". Decimals only when the amount has them. */
export function formatMoney(amount: number, currency: string) {
  const whole = Number.isInteger(amount);
  const digits = whole ? 0 : exponentOf(currency);
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** A charge as recorded (smallest unit and its currency), as money: 49900 INR → "₹499". */
export const formatMinor = (minor: number, currency: string) => formatMoney(minor / 10 ** exponentOf(currency), currency);
