import { NextRequest, NextResponse } from "next/server";
import { runChallengeStream } from "@/lib/challenge-stream";
import { checkApiKey } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const keyError = checkApiKey();
  if (keyError) return keyError;

  let body: {
    personaId?: string;
    decision?: string;
    initialResponse?: string;
    priorChallenges?: Array<{
      challengeText: string;
      replyContent: string;
      isReplyComplete: boolean;
    }>;
    challengeText?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { personaId, decision, initialResponse, priorChallenges, challengeText } = body;

  if (!personaId || !decision || !initialResponse || !challengeText) {
    return NextResponse.json(
      { error: "personaId, decision, initialResponse, and challengeText are required" },
      { status: 400 }
    );
  }

  if (decision.length > 5000) {
    return NextResponse.json(
      { error: "Decision text must be under 5000 characters" },
      { status: 400 }
    );
  }

  if (challengeText.length > 2000) {
    return NextResponse.json(
      { error: "Challenge text must be under 2000 characters" },
      { status: 400 }
    );
  }

  if (initialResponse.length > 10000) {
    return NextResponse.json(
      { error: "Initial response too large" },
      { status: 400 }
    );
  }

  if ((priorChallenges?.length ?? 0) > 10) {
    return NextResponse.json(
      { error: "Too many prior challenges (max 10)" },
      { status: 400 }
    );
  }

  const stream = runChallengeStream({
    personaId,
    decision,
    initialResponse,
    priorChallenges: priorChallenges ?? [],
    challengeText,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
