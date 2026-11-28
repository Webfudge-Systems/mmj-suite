"use client";

import { Children } from "react";
import { motion, useReducedMotion } from "motion/react";

/** The page's one orchestrated entrance: hero lines rise in, one after another. */
export function HeroIntro({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative max-w-xl">
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={index}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
