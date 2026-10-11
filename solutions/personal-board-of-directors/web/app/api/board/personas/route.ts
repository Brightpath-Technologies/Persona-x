import { NextResponse } from "next/server";
import { loadBoardPersonas, toPersonaProfiles } from "@/lib/personas";

export async function GET() {
  try {
    const personas = await loadBoardPersonas();
    const profiles = toPersonaProfiles(personas);
    return NextResponse.json({ personas: profiles });
  } catch (err) {
    console.error("Failed to load personas:", err);
    return NextResponse.json(
      { error: "Failed to load persona profiles" },
      { status: 500 }
    );
  }
}
