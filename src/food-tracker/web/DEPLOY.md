# Deploying the Food Tracker to fitness.brightpathtechnology.io

All integration work has been prepared and verified (the fitness-dashboard
production build succeeds with the Food tab in place). However, this
automated session cannot sign commits for the external `victorycross/fitness-dashboard`
repo — commit signing is scoped to `brightpath-technologies/persona-x` only.

You have two straightforward paths to deploy.

---

## Option A — Apply the prepared patch (fastest)

The file `fitness-dashboard-integration.patch` in this directory contains every
change required. From a fresh clone of your fitness-dashboard repo on a machine
with push access:

```bash
git clone https://github.com/victorycross/fitness-dashboard.git
cd fitness-dashboard
git apply /path/to/fitness-dashboard-integration.patch
git add src/App.jsx src/FoodTab.jsx supabase/
git commit -m "Add Food Tracker tab with AI-powered natural language logging"
git push origin main
```

Pushing to `main` triggers the GitHub Actions `deploy.yml` workflow, which
builds and publishes to Pages (~30s).

## Option B — Manual file copy

If you'd rather not use the patch:

1. Copy `FoodTab.jsx` into `fitness-dashboard/src/FoodTab.jsx`
2. Copy `supabase/functions/parse-food/index.ts` and `supabase/migrations/20260416_create_food_log.sql`
3. Make three edits to `src/App.jsx`:

   **Edit 1 — Add import (line 4):**
   ```jsx
   import FoodTab from "./FoodTab.jsx";
   ```

   **Edit 2 — Add tab button (inside the tab array, around line 2006):**
   ```jsx
   ["food",     "Food"],
   ```
   Insert between the Goals and Profile entries.

   **Edit 3 — Add tab content (after the Goals tab block, around line 2239):**
   ```jsx
   {/* FOOD TAB */}
   {tab === "food" && (
     <FoodTab supabase={supabase} user={user} toast={msg => { setToast(msg); setTimeout(() => setToast(""), 2500); }} />
   )}
   ```

4. Commit and push to `main`.

---

## Post-deploy Supabase setup (required either way)

The GitHub Pages build handles the React frontend. Two additional steps are
needed in Supabase:

### 1. Apply the migration

In the Supabase dashboard SQL editor, paste and run the contents of
`supabase/migrations/20260416_create_food_log.sql`. This creates the
`food_log` table with Row Level Security policies.

### 2. Deploy the edge function

```bash
cd fitness-dashboard
supabase link --project-ref ibiszdvdhffvrissciyj
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  # if not already set
supabase functions deploy parse-food
```

If the Anthropic key is already configured for the existing `parse-workout`
function, `parse-food` will use the same key automatically.

---

## What you'll see when deployed

A new "Food" tab appears between Goals and Profile. In it:

- **Natural language input** — type "2 eggs and toast for breakfast" and
  Claude Haiku parses it into structured food entries with calories and macros
- **Date navigation** — ◀ ▶ buttons to browse past days
- **Meal grouping** — entries grouped by breakfast/lunch/dinner/snack
- **Macro bar** — visual protein / carbs / fat breakdown
- **Daily totals** — kcal + macros for the selected date
- **14-day history** — tap any day to jump to it
- **Delete entries** — one-tap removal
- **RLS secured** — users only see their own food log

Styled to match the existing fitness dashboard exactly (dark theme, Barlow
Condensed, #C8FF00 accent).
