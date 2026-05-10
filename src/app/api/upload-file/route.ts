import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

/** Extensions that should be converted to WebP */
const CONVERTIBLE = new Set(["png", "jpg", "jpeg", "tiff", "bmp"]);

/**
 * POST /api/upload-file
 * FormData: { file: File, filename: string, folder?: string }
 * Uploads the file to R2 server-side — auto-converts PNG/JPG to WebP.
 */
export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get("file") as File | null;
    const filename = form.get("filename") as string | null;
    const folder   = (form.get("folder") as string | null) ?? "images";

    if (!file || !filename) {
      return NextResponse.json({ error: "Missing file or filename" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const ext       = filename.split(".").pop()!.toLowerCase();

    let finalBuffer: Buffer;
    let finalFilename: string;
    let contentType: string;

    if (CONVERTIBLE.has(ext)) {
      // Convert to WebP with sharp — quality 85 is a good balance
      finalBuffer   = await sharp(rawBuffer).webp({ quality: 85 }).toBuffer();
      finalFilename = filename.replace(/\.[^.]+$/, ".webp");
      contentType   = "image/webp";
    } else {
      // Already WebP, GIF, or other — pass through
      finalBuffer   = rawBuffer;
      finalFilename = filename;
      contentType   = file.type || "application/octet-stream";
    }

    const key = `${folder}/${finalFilename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET!,
        Key:         key,
        Body:        finalBuffer,
        ContentType: contentType,
      })
    );

    return NextResponse.json({ success: true, key, filename: finalFilename });
  } catch (err) {
    console.error("upload-file error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const maxDuration = 60; // seconds
