import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { FoodTrackerDataSchema, type FoodTrackerData, type FoodEntry } from "./schema.js";

const DATA_DIR = path.join(os.homedir(), ".persona-x", "food-tracker");
const DATA_FILE = path.join(DATA_DIR, "data.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function emptyData(): FoodTrackerData {
  return { version: "1.0.0", entries: [] };
}

export function loadData(): FoodTrackerData {
  ensureDataDir();

  if (!fs.existsSync(DATA_FILE)) {
    return emptyData();
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = FoodTrackerDataSchema.safeParse(parsed);

  if (!result.success) {
    const backupPath = DATA_FILE + `.backup-${Date.now()}`;
    fs.copyFileSync(DATA_FILE, backupPath);
    console.warn(`Food tracker data was invalid. Backed up to ${backupPath} and starting fresh.`);
    return emptyData();
  }

  return result.data;
}

export function saveData(data: FoodTrackerData): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function addEntry(entry: FoodEntry): void {
  const data = loadData();
  data.entries.push(entry);
  saveData(data);
}

export function removeEntry(entryId: string): boolean {
  const data = loadData();
  const before = data.entries.length;
  data.entries = data.entries.filter((e: FoodEntry) => e.entry_id !== entryId);

  if (data.entries.length === before) return false;

  saveData(data);
  return true;
}

export function getEntriesForDate(date: string): FoodEntry[] {
  const data = loadData();
  return data.entries.filter((e: FoodEntry) => e.logged_at.startsWith(date));
}

export function getEntriesInRange(startDate: string, endDate: string): FoodEntry[] {
  const data = loadData();
  return data.entries.filter((e: FoodEntry) => {
    const entryDate = e.logged_at.slice(0, 10);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

export function getDataFilePath(): string {
  return DATA_FILE;
}
