import { Command } from "commander";
import chalk from "chalk";
import type { FoodItem } from "../food-tracker/schema.js";
import {
  searchFoods,
  lookupBarcode,
  logFood,
  removeLoggedFood,
  getDailySummary,
  getHistory,
  todayDate,
  type ApiSource,
} from "../food-tracker/tracker.js";
import { getDataFilePath } from "../food-tracker/storage.js";

function formatNutrition(
  n: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g?: number; sugar_g?: number; sodium_mg?: number },
  indent = "",
): string {
  const lines = [
    `${indent}${chalk.bold("Calories:")} ${n.calories} kcal`,
    `${indent}${chalk.bold("Protein:")}  ${n.protein_g}g`,
    `${indent}${chalk.bold("Carbs:")}    ${n.carbs_g}g`,
    `${indent}${chalk.bold("Fat:")}      ${n.fat_g}g`,
  ];
  if (n.fibre_g != null) lines.push(`${indent}${chalk.bold("Fibre:")}    ${n.fibre_g}g`);
  if (n.sugar_g != null) lines.push(`${indent}${chalk.bold("Sugar:")}    ${n.sugar_g}g`);
  if (n.sodium_mg != null) lines.push(`${indent}${chalk.bold("Sodium:")}   ${n.sodium_mg}mg`);
  return lines.join("\n");
}

function formatFoodRow(index: number, item: FoodItem): string {
  const brand = item.brand ? ` (${item.brand})` : "";
  const serving = item.serving_size ? ` [${item.serving_size}]` : "";
  return `  ${chalk.cyan(String(index + 1))}. ${item.name}${brand}${serving} — ${item.nutrition.calories} kcal | P:${item.nutrition.protein_g}g C:${item.nutrition.carbs_g}g F:${item.nutrition.fat_g}g  ${chalk.dim(`[${item.source}:${item.id}]`)}`;
}

export function registerFoodCommands(program: Command): void {
  const food = program
    .command("food")
    .description("Local food tracker — search, log, and review daily nutrition");

  food
    .command("search")
    .description("Search for foods across open APIs")
    .argument("<query...>", "Search terms")
    .option("-s, --source <source>", "API source: openfoodfacts, usda, or all", "all")
    .option("-n, --limit <number>", "Max results", "10")
    .action(async (queryParts: string[], opts: { source: string; limit: string }) => {
      const query = queryParts.join(" ");
      const source = opts.source as ApiSource;
      const limit = parseInt(opts.limit, 10);

      console.log(chalk.dim(`Searching for "${query}" via ${source}...`));

      try {
        const results = await searchFoods(query, source, limit);

        if (results.length === 0) {
          console.log(chalk.yellow("No results found."));
          return;
        }

        console.log(chalk.green(`\nFound ${results.length} result(s):\n`));
        for (let i = 0; i < results.length; i++) {
          console.log(formatFoodRow(i, results[i]!));
        }
        console.log(
          chalk.dim("\nTo log a food, copy its ID and run:"),
        );
        console.log(
          chalk.dim("  persona-x food log <source> <id> [--servings N] [--meal breakfast|lunch|dinner|snack]"),
        );
      } catch (err) {
        console.error(chalk.red(`Search failed: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
      }
    });

  food
    .command("barcode")
    .description("Look up a food by barcode (EAN/UPC)")
    .argument("<barcode>", "Barcode to look up")
    .action(async (barcode: string) => {
      console.log(chalk.dim(`Looking up barcode ${barcode}...`));

      try {
        const result = await lookupBarcode(barcode);

        if (!result) {
          console.log(chalk.yellow("No food found for that barcode."));
          return;
        }

        const brand = result.brand ? ` (${result.brand})` : "";
        console.log(chalk.green(`\n${result.name}${brand}`));
        console.log(`Serving: ${result.serving_size ?? "unknown"}`);
        console.log(formatNutrition(result.nutrition));
        console.log(chalk.dim(`\nID: ${result.source}:${result.id}`));
      } catch (err) {
        console.error(chalk.red(`Lookup failed: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
      }
    });

  food
    .command("log")
    .description("Log a food by searching and selecting, or by source:id")
    .argument("<source>", "API source: openfoodfacts or usda")
    .argument("<id>", "Food ID from the source API")
    .option("-v, --servings <number>", "Number of servings", "1")
    .option("-m, --meal <meal>", "Meal: breakfast, lunch, dinner, snack", "snack")
    .option("--notes <text>", "Optional notes")
    .action(
      async (
        source: string,
        id: string,
        opts: { servings: string; meal: string; notes?: string },
      ) => {
        const { OpenFoodFactsClient } = await import("../food-tracker/api/openfoodfacts.js");
        const { UsdaClient } = await import("../food-tracker/api/usda.js");

        let provider;
        if (source === "openfoodfacts" || source === "off") {
          provider = new OpenFoodFactsClient();
        } else if (source === "usda") {
          provider = new UsdaClient();
        } else {
          console.error(chalk.red(`Unknown source "${source}". Use: openfoodfacts, off, usda`));
          process.exit(1);
        }

        console.log(chalk.dim(`Fetching food ${id} from ${source}...`));

        try {
          const food = await provider.getById(id);

          if (!food) {
            console.error(chalk.red(`Food not found: ${id}`));
            process.exit(1);
          }

          const entry = logFood(food, {
            servings: parseFloat(opts.servings),
            meal: opts.meal as "breakfast" | "lunch" | "dinner" | "snack",
            notes: opts.notes,
          });

          const brand = food.brand ? ` (${food.brand})` : "";
          console.log(chalk.green(`\nLogged: ${food.name}${brand}`));
          console.log(`  Servings: ${entry.servings} | Meal: ${entry.meal}`);
          console.log(
            `  Calories: ${Math.round(food.nutrition.calories * entry.servings)} kcal`,
          );
          console.log(chalk.dim(`  Entry ID: ${entry.entry_id}`));
        } catch (err) {
          console.error(chalk.red(`Log failed: ${err instanceof Error ? err.message : String(err)}`));
          process.exit(1);
        }
      },
    );

  food
    .command("today")
    .description("View today's food log and nutrition totals")
    .action(() => {
      const date = todayDate();
      const summary = getDailySummary(date);

      console.log(chalk.bold(`\nFood log for ${date}\n`));

      if (summary.entries.length === 0) {
        console.log(chalk.yellow("No entries logged today."));
        return;
      }

      const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
      for (const meal of meals) {
        const mealEntries = summary.entries.filter((e) => e.meal === meal);
        if (mealEntries.length === 0) continue;

        console.log(chalk.bold.underline(meal.charAt(0).toUpperCase() + meal.slice(1)));
        for (const entry of mealEntries) {
          const brand = entry.food.brand ? ` (${entry.food.brand})` : "";
          const cals = Math.round(entry.food.nutrition.calories * entry.servings);
          const servLabel = entry.servings !== 1 ? ` x${entry.servings}` : "";
          console.log(
            `  ${entry.food.name}${brand}${servLabel} — ${cals} kcal  ${chalk.dim(`[${entry.entry_id.slice(0, 8)}]`)}`,
          );
        }
        console.log();
      }

      console.log(chalk.bold("Daily totals:"));
      console.log(formatNutrition(summary.totals, "  "));
      console.log();
    });

  food
    .command("history")
    .description("View food log history")
    .option("-d, --days <number>", "Number of days to show", "7")
    .action((opts: { days: string }) => {
      const days = parseInt(opts.days, 10);
      const summaries = getHistory(days);

      if (summaries.length === 0) {
        console.log(chalk.yellow(`No entries in the last ${days} day(s).`));
        return;
      }

      console.log(chalk.bold(`\nFood history (last ${days} days)\n`));

      for (const day of summaries) {
        const t = day.totals;
        console.log(
          `${chalk.cyan(day.date)}  ${day.entries.length} entries  |  ` +
            `${t.calories} kcal  P:${t.protein_g}g  C:${t.carbs_g}g  F:${t.fat_g}g`,
        );
      }
      console.log();
    });

  food
    .command("remove")
    .description("Remove a logged food entry by ID (or first 8 chars)")
    .argument("<entry-id>", "Entry ID or prefix")
    .action(async (entryId: string) => {
      const { loadData } = await import("../food-tracker/storage.js");
      const data = loadData();

      // Support prefix matching
      const match = data.entries.find(
        (e) => e.entry_id === entryId || e.entry_id.startsWith(entryId),
      );

      if (!match) {
        console.error(chalk.red(`No entry found matching "${entryId}".`));
        process.exit(1);
      }

      removeLoggedFood(match.entry_id);
      console.log(chalk.green(`Removed: ${match.food.name} (${match.logged_at.slice(0, 10)})`));
    });

  food
    .command("parse")
    .description("Parse a natural language food description using AI (requires ANTHROPIC_API_KEY)")
    .argument("<description...>", "Natural language food description")
    .option("-m, --meal <meal>", "Override meal: breakfast, lunch, dinner, snack")
    .option("--log", "Automatically log the parsed foods locally", false)
    .action(
      async (
        descParts: string[],
        opts: { meal?: string; log?: boolean },
      ) => {
        const description = descParts.join(" ");

        if (!process.env["ANTHROPIC_API_KEY"]) {
          console.error(chalk.red("Set ANTHROPIC_API_KEY environment variable to use AI parsing."));
          process.exit(1);
        }

        console.log(chalk.dim(`Parsing: "${description}"...`));

        try {
          const { parseFood } = await import("../food-tracker/parser.js");
          const result = await parseFood(description);

          if (result.foods.length === 0) {
            console.log(chalk.yellow("Couldn't identify any foods. Try being more specific."));
            return;
          }

          const meal = (opts.meal as "breakfast" | "lunch" | "dinner" | "snack") ?? result.meal ?? "snack";
          const date = result.date ?? todayDate();

          console.log(chalk.green(`\nParsed ${result.foods.length} food(s):`));
          if (result.meal) console.log(`  Meal: ${result.meal}`);
          if (result.date) console.log(`  Date: ${result.date}`);
          if (result.notes) console.log(`  Notes: ${result.notes}`);
          console.log();

          let totalCal = 0;

          for (const food of result.foods) {
            const cal = food.calories;
            totalCal += cal;
            console.log(`  ${chalk.cyan(food.name)} (${food.quantity} ${food.unit})`);
            console.log(
              `    ${cal} kcal | P:${food.protein_g}g C:${food.carbs_g}g F:${food.fat_g}g` +
                (food.fibre_g ? ` Fibre:${food.fibre_g}g` : ""),
            );

            if (opts.log) {
              logFood(
                {
                  id: `parsed-${Date.now()}`,
                  name: food.name,
                  source: "openfoodfacts",
                  serving_size: `${food.quantity} ${food.unit}`,
                  nutrition: {
                    calories: food.calories,
                    protein_g: food.protein_g,
                    carbs_g: food.carbs_g,
                    fat_g: food.fat_g,
                    fibre_g: food.fibre_g,
                  },
                },
                { servings: 1, meal, notes: result.notes ?? undefined },
              );
            }
          }

          console.log(chalk.bold(`\n  Total: ${totalCal} kcal`));

          if (opts.log) {
            console.log(chalk.green(`\nLogged ${result.foods.length} food(s) for ${meal} on ${date}.`));
          } else {
            console.log(chalk.dim("\nAdd --log to save these entries locally."));
          }
        } catch (err) {
          console.error(chalk.red(`Parse failed: ${err instanceof Error ? err.message : String(err)}`));
          process.exit(1);
        }
      },
    );

  food
    .command("path")
    .description("Show where food tracker data is stored")
    .action(() => {
      console.log(getDataFilePath());
    });
}
