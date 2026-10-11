import { getNewsrooms, getContributorLedger, type ContributorStats } from "@/lib/data";
import { upsertContributor, deleteContributor } from "@/app/actions";
import { CONTRIBUTOR_ROLES, roleLabel } from "@/lib/roles";
import { isHttpUrl } from "@/lib/url";
import type { Contributor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const rooms = await getNewsrooms();
  if (rooms.length === 0) {
    return <p className="text-sm text-grey">Found a newsroom first.</p>;
  }
  const room = rooms.find((r) => r.id === n) ?? rooms[0];
  const people = await getContributorLedger(room.id);

  return (
    <div className="space-y-7">
      <div className="border-b border-line pb-4">
        <h2 className="font-display text-2xl font-light text-paper-50">
          Contributors
        </h2>
        <p className="text-sm text-grey">
          The humans behind the work — writers, copy editors, photographers,
          artists, and subject-matter experts. The desks are AI; these people
          are credited on the page and compensated for their craft.
        </p>
      </div>

      {/* Add */}
      <details className="rounded-lg border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-navy">
          + Add a contributor
        </summary>
        <div className="mt-3">
          <ContributorForm newsroomId={room.id} />
        </div>
      </details>

      {/* Directory */}
      {people.length === 0 ? (
        <p className="text-sm text-grey">No contributors yet.</p>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-line bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-light text-paper-50">
                      {p.name}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-grey">
                      {roleLabel(p.role)}
                    </span>
                    {!p.active && (
                      <span className="text-[10px] uppercase text-grey">
                        inactive
                      </span>
                    )}
                  </div>
                  {p.bio && <p className="mt-1 text-sm text-grey">{p.bio}</p>}
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-grey">
                    {p.contact && <span>{p.contact}</span>}
                    {isHttpUrl(p.portfolio_url) && (
                      <a
                        href={p.portfolio_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy hover:underline"
                      >
                        portfolio
                      </a>
                    )}
                    {p.rate_note && <span>rate: {p.rate_note}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-grey">
                  <div>
                    {p.creditCount} credit{p.creditCount === 1 ? "" : "s"}
                  </div>
                  <CompensationSummary p={p} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                <details className="flex-1">
                  <summary className="cursor-pointer text-xs text-navy">
                    Edit
                  </summary>
                  <div className="mt-3">
                    <ContributorForm newsroomId={room.id} contributor={p} />
                  </div>
                </details>
                <form action={deleteContributor}>
                  <input type="hidden" name="contributorId" value={p.id} />
                  <button className="rounded border border-line px-2 py-1 text-[11px] text-grey hover:border-red-400 hover:text-red-500">
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompensationSummary({ p }: { p: ContributorStats }) {
  const entries = Object.entries(p.totals);
  if (entries.length === 0) return null;
  return (
    <div className="mt-0.5 space-y-0.5">
      {entries.map(([cur, t]) => (
        <div key={cur}>
          {t.paid > 0 && (
            <span className="text-grey">
              {cur} {t.paid.toFixed(2)} paid
            </span>
          )}
          {t.outstanding > 0 && (
            <span className="ml-1 text-amber-600">
              {cur} {t.outstanding.toFixed(2)} owed
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ContributorForm({
  newsroomId,
  contributor,
}: {
  newsroomId: string;
  contributor?: Contributor;
}) {
  return (
    <form action={upsertContributor} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="newsroomId" value={newsroomId} />
      {contributor && (
        <input type="hidden" name="contributorId" value={contributor.id} />
      )}
      <input
        name="name"
        required
        defaultValue={contributor?.name}
        placeholder="Name"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm"
      />
      <select
        name="role"
        defaultValue={contributor?.role ?? "writer"}
        className="rounded border border-line bg-white px-2 py-1.5 text-sm"
      >
        {CONTRIBUTOR_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        name="contact"
        defaultValue={contributor?.contact ?? ""}
        placeholder="Contact (email / handle)"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm"
      />
      <input
        name="portfolio_url"
        defaultValue={contributor?.portfolio_url ?? ""}
        placeholder="Portfolio URL"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm"
      />
      <input
        name="attribution"
        defaultValue={contributor?.attribution ?? ""}
        placeholder="Byline / how to credit them"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm sm:col-span-2"
      />
      <input
        name="rate_note"
        defaultValue={contributor?.rate_note ?? ""}
        placeholder="Standing rate / terms (e.g. $250/photo)"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm sm:col-span-2"
      />
      <textarea
        name="bio"
        rows={2}
        defaultValue={contributor?.bio ?? ""}
        placeholder="Short bio / expertise"
        className="rounded border border-line bg-white px-2 py-1.5 text-sm sm:col-span-2"
      />
      <label className="flex items-center gap-2 text-xs text-grey">
        {/* hidden companion so an unchecked box still submits "false" (read last) */}
        <input type="hidden" name="active" value="false" />
        <input
          type="checkbox"
          name="active"
          value="true"
          defaultChecked={contributor?.active ?? true}
        />
        Active (available for assignments)
      </label>
      <div className="sm:col-span-2">
        <button className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90">
          {contributor ? "Save changes" : "Add contributor"}
        </button>
      </div>
    </form>
  );
}
