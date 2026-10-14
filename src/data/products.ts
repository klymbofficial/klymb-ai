/** The free platform. Tagged so its analytics can tell visits from klymb.ai apart. */
export const APP_URL = "https://app.klymb.ai/?utm_source=klymb.ai&utm_medium=referral&utm_campaign=klymb-site";

export interface Product {
  name: string;
  description: string;
  /** Omit for a product that isn't launched yet. */
  href?: string;
  external?: boolean;
  badge?: "Free" | "Coming soon" | "You're here";
}

/**
 * The Klymb family, shown in the Products menu. To launch the next product,
 * give it an href and drop its "Coming soon" badge; add more by adding items.
 */
export const products: Product[] = [
  { name: "Klymb.ai Courses", description: "30-day job-ready courses with reviewed work and mock interviews.", href: "/tracks", badge: "You're here" },
  { name: "app.klymb.ai", description: "Free hackathons, challenges and cohorts. Get discovered by recruiters.", href: APP_URL, external: true, badge: "Free" },
  { name: "Something new", description: "Our next product for your career. Launching soon.", badge: "Coming soon" },
];
