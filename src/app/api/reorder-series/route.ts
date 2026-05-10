import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET } from "@/lib/s3";

const KEY = "config/series-order.json";

export async function POST(req: NextRequest) {
  try {
    const { order } = await req.json();
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: KEY,
        Body: JSON.stringify(order, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reorder-series error", err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: KEY })
    );
    const str = await response.Body?.transformToString();
    return NextResponse.json(str ? JSON.parse(str) : []);
  } catch {
    return NextResponse.json([]);
  }
}
