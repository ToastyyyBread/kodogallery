import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const key = `metadata/${body.id}.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: JSON.stringify(body, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true, id: body.id });
  } catch (err) {
    console.error("save-metadata error", err);
    return NextResponse.json({ error: "Failed to save metadata" }, { status: 500 });
  }
}
