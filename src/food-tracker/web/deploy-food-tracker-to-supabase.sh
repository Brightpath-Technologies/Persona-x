#!/usr/bin/env bash
# One-shot Supabase setup for the Food Tracker.
# Runs the migration and deploys the parse-food edge function.
#
# Prereqs:
#   - Supabase CLI installed (https://supabase.com/docs/guides/cli)
#   - Run from the root of your fitness-dashboard repo (after applying the
#     integration patch, so supabase/functions/parse-food and
#     supabase/migrations/20260416_create_food_log.sql exist)
#   - ANTHROPIC_API_KEY secret already set (parse-workout uses it too)
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."   # rotate yours after sharing in chat
#   export SUPABASE_DB_PASSWORD="..."        # from Project Settings → Database
#   ./deploy-food-tracker-to-supabase.sh

set -euo pipefail

PROJECT_REF="ibiszdvdhffvrissciyj"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: export SUPABASE_ACCESS_TOKEN first"
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: export SUPABASE_DB_PASSWORD first"
  exit 1
fi

echo "→ Linking project $PROJECT_REF…"
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "→ Applying migration (food_log table + RLS)…"
supabase db push --password "$SUPABASE_DB_PASSWORD"

echo "→ Deploying parse-food edge function…"
supabase functions deploy parse-food

echo ""
echo "✓ Done. The food tracker is wired up."
echo "  Push the fitness-dashboard repo to main to deploy the UI."
