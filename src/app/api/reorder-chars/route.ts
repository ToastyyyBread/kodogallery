import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET } from "@/lib/s3";

const KEY = "config/char-order.json";

export async function POST(req: NextRequest) {
  try {
    const { seriesSlug, order } = await req.json();
    if (!seriesSlug || !Array.isArray(order)) {
      return NextResponse.json({ error: "seriesSlug and order[] required" }, { status: 400 });
    }

    // Merge with existing data
    let existing: Record<string, string[]> = {};
    try {
      const response = await s3.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: KEY })
      );
      const str = await response.Body?.transformToString();
      if (str) {
        existing = JSON.parse(str);
      }
    } catch { /* first time or file doesn't exist */ }

    existing[seriesSlug] = order;
    
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: KEY,
        Body: JSON.stringify(existing, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reorder-chars error", err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: KEY })
    );
    const str = await response.Body?.transformToString();
    return NextResponse.json(str ? JSON.parse(str) : {});
  } catch {
    return NextResponse.json({});
  }
}
