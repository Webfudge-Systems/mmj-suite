/** Long-form copy for the policy and guide pages. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-w-2xl space-y-5 text-[14px] leading-relaxed text-ash
        [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4
        [&_h2]:mt-12 [&_h2]:text-[20px] [&_h2]:text-ink
        [&_h3]:mt-8 [&_h3]:text-[16px] [&_h3]:text-ink
        [&_li]:pl-1 [&_strong]:text-ink
        [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
    >
      {children}
    </div>
  );
}
