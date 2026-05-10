import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, R2_BUCKET } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const { filename, type, seriesName, characterName } = await req.json();

    if (!filename || !type || !seriesName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let updated = 0;
    let continuationToken: string | undefined;

    do {
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: "metadata/",
          ContinuationToken: continuationToken,
        })
      );

      if (!listRes.Contents) break;

      for (const object of listRes.Contents) {
        if (!object.Key?.endsWith(".json")) continue;

        try {
          const getRes = await s3.send(
            new GetObjectCommand({ Bucket: R2_BUCKET, Key: object.Key })
          );
          const raw = await getRes.Body?.transformToString();
          if (!raw) continue;

          const item = JSON.parse(raw);
          const itemSeries = (item.tags?.[1] as string | undefined) ?? "";
          const itemChar   = (item.tags?.[0] as string | undefined) ?? "";
          const seriesMatch = itemSeries.toLowerCase() === seriesName.toLowerCase();

          let modified = false;

          if (type === "series" && seriesMatch) {
            item.series_cover_image = filename;
            modified = true;
          } else if (
            type === "char" &&
            seriesMatch &&
            characterName &&
            itemChar.toLowerCase() === characterName.toLowerCase()
          ) {
            item.char_cover_image = filename;
            modified = true;
          }

          if (modified) {
            await s3.send(
              new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: object.Key,
                Body: JSON.stringify(item, null, 2),
                ContentType: "application/json",
              })
            );
            updated++;
          }
        } catch {
          // skip malformed files
        }
      }
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("update-cover error", err);
    return NextResponse.json({ error: "Failed to update cover" }, { status: 500 });
  }
}
