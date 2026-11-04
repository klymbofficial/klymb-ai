
export interface Product {
  name: string;
  description: string;
  /** Omit for a product that isn't launched yet. */
  href?: string;
  external?: boolean;
  badge?: "Free" | "Coming soon" | "You're here" | "New";
}

/**
 * The Klymb family, shown in the Products menu. To launch the next product,
 * give it an href and drop its "Coming soon" badge; add more by adding items.
 */
export const products: Product[] = [
  { name: "Klymb.ai Courses", description: "30-day job-ready courses with reviewed work and interview prep.", href: "/tracks", badge: "You're here" },
  { name: "System Design", description: "21 days, 15 minutes a day, on your phone. Built for interviews.", href: "/system-design", badge: "New" },
  { name: "60-day challenges", description: "Claude, AI, software engineering and data science: one task a day, built in public.", href: "/challenges", badge: "New" },
  { name: "Something new", description: "Our next product for your career. Launching soon.", badge: "Coming soon" },
];
