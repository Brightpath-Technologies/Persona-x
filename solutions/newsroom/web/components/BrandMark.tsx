// BrightPath Technology brand mark — the overlapping-rings compass glyph used
// across brightpathtechnology.io. Inherits color via `currentColor`.

export default function BrandMark({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 300"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="5.5">
        <circle cx="128" cy="150" r="96" />
        <circle cx="188" cy="146" r="82" />
        <line x1="168" y1="64" x2="168" y2="228" />
      </g>
      <g stroke="currentColor" strokeWidth="2.6">
        <line x1="122" y1="214" x2="178" y2="214" />
        <line x1="135" y1="224" x2="165" y2="224" />
      </g>
    </svg>
  );
}
