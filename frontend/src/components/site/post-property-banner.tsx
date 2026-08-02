"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PostPropertyWizard } from "@/components/site/post-property-wizard";

export function PostPropertyBanner() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[20px]">
        <Image
          src="/post-property-banner.webp"
          alt="List your property on MakanMantraa and reach the right buyers"
          width={3838}
          height={1416}
          sizes="(min-width: 1280px) 1226px, 100vw"
          className="h-auto w-full object-cover"
        />

        <Link
          href="/post-property"
          className="absolute bottom-[6%] left-[3.2%] inline-flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-[11px] font-semibold text-saffron-foreground shadow-lg transition-colors hover:bg-saffron/90 sm:px-4 sm:py-2 sm:text-xs md:px-5 md:text-sm"
        >
          Explore Now <ArrowRight className="size-3.5 md:size-4" />
        </Link>
      </div>

      <PostPropertyWizard variant="compact" source="banner" className="relative z-10 -mt-6 mx-3 sm:mx-8 lg:absolute lg:-right-3 lg:top-1/2 lg:mx-0 lg:mt-0 lg:w-[430px] lg:-translate-y-1/2" />
    </div>
  );
}
