"use client";

import dynamic from "next/dynamic";
import { LazyMount } from "./LazyMount";

const PromoFilmImpl = dynamic(() => import("@/components/home/PromoFilm").then((m) => m.PromoFilm), { ssr: false });
const HowItWorksImpl = dynamic(() => import("@/components/home/HowItWorks").then((m) => m.HowItWorks), { ssr: false });
const EvalDemoImpl = dynamic(() => import("@/components/home/EvalDemo").then((m) => m.EvalDemo), { ssr: false });

/** The film, loaded when the reader nears it; its frame size is reserved meanwhile. */
export function LazyPromoFilm() {
  return (
    <LazyMount className="mx-4 my-16 aspect-[4/5] sm:mx-6 sm:my-20 sm:aspect-video xl:mx-auto xl:max-w-[calc(80rem-3rem)]">
      <PromoFilmImpl />
    </LazyMount>
  );
}

/** The grading demo, loaded when the reader nears it. */
export function LazyEvalDemo() {
  return (
    <LazyMount className="mt-6 min-h-[34rem] rounded-slab lg:min-h-[30rem]">
      <EvalDemoImpl />
    </LazyMount>
  );
}

/** "How it works" loads its scroll-driven version as the reader approaches; the static one is server-rendered. */
export function LazyHowItWorks({ fallback }: { fallback: React.ReactNode }) {
  return (
    <LazyMount margin="900px" fallback={fallback}>
      <HowItWorksImpl />
    </LazyMount>
  );
}
