import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ORDER_FILE = path.join(process.cwd(), "data", "series-order.json");

/**
 * POST /api/reorder-series
 * Body: { order: string[] }   — array of series slugs in the desired order
 * Saves the order to data/series-order.json
 */
export async function POST(req: NextRequest) {
  try {
    const { order } = await req.json();
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }
    await fs.mkdir(path.dirname(ORDER_FILE), { recursive: true });
    await fs.writeFile(ORDER_FILE, JSON.stringify(order, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reorder-series error", err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}

/**
 * GET /api/reorder-series
 * Returns the saved order array (or empty array if not set yet)
 */
export async function GET() {
  try {
    const raw = await fs.readFile(ORDER_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json([]);
  }
}
