import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/firebase/session";
import { listInterns, createIntern } from "@/lib/actions/interns";
import { ZodError } from "zod";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  try {
    const interns = await listInterns();
    return NextResponse.json({ interns });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load interns." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const intern = await createIntern(body);
    return NextResponse.json({ intern }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Validation failed." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create intern." },
      { status: 400 }
    );
  }
}
