"use client";

export function ConsultingLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-fade-in flex flex-col items-center justify-center py-24">
      <div className="h-3 w-3 rounded-full bg-board-accent animate-pulse mb-6" />
      <h2 className="text-2xl font-serif text-board-text">
        Convening the Board...
      </h2>
      <p className="text-sm text-board-text-tertiary mt-2">
        Your advisors are preparing their perspectives
      </p>
    </div>
  );
}
