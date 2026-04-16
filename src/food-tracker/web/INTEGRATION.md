# Food Tracker — Fitness Dashboard Integration Guide

Add the Food Tracker tab to your existing fitness dashboard at
`fitness.brightpathtechnology.io` in three steps.

---

## 1. Run the Supabase migration

Apply the migration to create the `food_log` table:

```bash
supabase db push
```

Or run the SQL in `supabase/migrations/20260416_create_food_log.sql` directly
in the Supabase SQL editor.

---

## 2. Deploy the `parse-food` Edge Function

```bash
supabase functions deploy parse-food
```

Make sure your Supabase project has the `ANTHROPIC_API_KEY` secret set:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## 3. Add the FoodTab to App.jsx

### a) Copy `FoodTab.jsx` into your `src/` directory

```bash
cp src/food-tracker/web/FoodTab.jsx ../fitness-dashboard/src/FoodTab.jsx
```

### b) Import it in `App.jsx`

Near the top of `App.jsx`, add:

```jsx
import FoodTab from "./FoodTab.jsx";
```

### c) Add "Food" to the tab list

Find the tab navigation buttons (the row with Workouts, Weight & BMI,
Goals, Profile, Admin). Add a Food tab:

```jsx
{["Workouts", "Weight & BMI", "Food", "Goals", "Profile", isAdmin && "Admin"]
  .filter(Boolean)
  .map((t) => (
    <button key={t} onClick={() => setTab(t)} ...>
      {t}
    </button>
  ))}
```

### d) Render the FoodTab when selected

In the tab content switch, add:

```jsx
{tab === "Food" && (
  <FoodTab
    supabase={supabase}
    user={session.user}
    toast={(msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); }}
  />
)}
```

---

## Features

- **Natural language input** — type "2 eggs and toast for breakfast" and the
  AI parses it into structured nutrition entries
- **Date navigation** — browse past days with ◀ ▶ buttons
- **Meal grouping** — entries organised by breakfast, lunch, dinner, snack
- **Macro bar** — visual protein / carbs / fat breakdown with daily totals
- **14-day history** — quick overview of recent calorie intake
- **Delete entries** — remove mistakes with one tap
- **RLS secured** — each user only sees their own food log

## Database schema

| Column     | Type          | Notes                        |
|-----------|--------------|------------------------------|
| id        | bigint (PK)  | Auto-generated               |
| user_id   | uuid (FK)    | References auth.users        |
| date      | date         | Defaults to today            |
| meal      | text         | breakfast/lunch/dinner/snack |
| name      | text         | Food name                    |
| quantity  | numeric(6,2) | e.g. 2, 1.5                 |
| unit      | text         | eggs, slice, cup, g, etc.   |
| calories  | integer      |                              |
| protein_g | numeric(6,1) |                              |
| carbs_g   | numeric(6,1) |                              |
| fat_g     | numeric(6,1) |                              |
| fibre_g   | numeric(6,1) | Optional                     |
| notes     | text         | Optional                     |
