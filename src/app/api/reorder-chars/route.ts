import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ORDER_FILE = path.join(process.cwd(), "data", "char-order.json");

/**
 * POST /api/reorder-chars
 * Body: { seriesSlug: string, order: string[] }  — character slugs in desired order
 */
export async function POST(req: NextRequest) {
  try {
    const { seriesSlug, order } = await req.json();
    if (!seriesSlug || !Array.isArray(order)) {
      return NextResponse.json({ error: "seriesSlug and order[] required" }, { status: 400 });
    }

    await fs.mkdir(path.dirname(ORDER_FILE), { recursive: true });

    // Merge with existing data
    let existing: Record<string, string[]> = {};
    try {
      existing = JSON.parse(await fs.readFile(ORDER_FILE, "utf-8"));
    } catch { /* first time */ }

    existing[seriesSlug] = order;
    await fs.writeFile(ORDER_FILE, JSON.stringify(existing, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reorder-chars error", err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const raw = await fs.readFile(ORDER_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({});
  }
}
