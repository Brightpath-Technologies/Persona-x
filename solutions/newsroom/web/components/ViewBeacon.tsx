"use client";

import { useEffect, useRef } from "react";

/** Fires a single view event when a published edition scrolls into view. */
export default function ViewBeacon({ editionId }: { editionId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true;
            fetch("/api/track/view", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ editionId }),
              keepalive: true,
            }).catch(() => {});
            obs.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [editionId]);

  return <span ref={ref} aria-hidden />;
}
