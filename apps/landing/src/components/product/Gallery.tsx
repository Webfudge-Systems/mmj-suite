"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Thumbnail rail plus a crossfading main frame. */
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative size-[68px] shrink-0 overflow-hidden border bg-cream-deep transition-colors sm:size-[84px]",
                  index === active ? "border-ink" : "border-transparent hover:border-line",
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="84px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-square flex-1 overflow-hidden bg-cream-deep">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={images[active]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={name}
              fill
              priority={active === 0}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
