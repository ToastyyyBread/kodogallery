import "server-only";
import fs from "fs/promises";
import path from "path";
import type { PromptItem, SeriesAlbum, CharacterAlbum } from "@/lib/types";

export type { PromptItem, SeriesAlbum, CharacterAlbum };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getFirstImage(item: PromptItem): string {
  if (item.images && item.images.length > 0) return item.images[0].filename;
  if (item.image_filenames && item.image_filenames.length > 0) return item.image_filenames[0];
  if (item.image_filename) return item.image_filename;
  return "";
}

import { s3, R2_BUCKET } from "@/lib/s3";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function getAllItems(): Promise<PromptItem[]> {
  const items: PromptItem[] = [];
  try {
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

      const fetchPromises = listRes.Contents
        .filter(obj => obj.Key?.endsWith(".json"))
        .map(async (object) => {
          try {
            const getRes = await s3.send(
              new GetObjectCommand({ Bucket: R2_BUCKET, Key: object.Key })
            );
            const raw = await getRes.Body?.transformToString();
            if (raw) return JSON.parse(raw) as PromptItem;
          } catch (e) {
            console.error(`Failed to fetch ${object.Key}`, e);
          }
          return null;
        });

      const batchItems = await Promise.all(fetchPromises);
      for (const item of batchItems) {
        if (item) items.push(item);
      }
      
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    return items.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } catch (e) {
    console.error("Failed to read metadata from S3", e);
    return [];
  }
}

/** Read the custom series order saved by the admin panel drag-and-drop */
export async function getSeriesOrder(): Promise<string[]> {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: "config/series-order.json" })
    );
    const raw = await response.Body?.transformToString();
    if (raw) return JSON.parse(raw) as string[];
  } catch { }
  return [];
}

/** Read per-series character order map: { [seriesSlug]: charSlug[] } */
export async function getCharOrder(): Promise<Record<string, string[]>> {
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: "config/char-order.json" })
    );
    const raw = await response.Body?.transformToString();
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch { }
  return {};
}


export async function getSeriesAlbums(): Promise<SeriesAlbum[]> {
  const items = await getAllItems();
  const seriesMap = new Map<string, Map<string, PromptItem[]>>();

  for (const item of items) {
    const character = item.tags?.[0] || "Unknown";
    const series = item.tags?.[1] || "Uncategorized";

    if (!seriesMap.has(series)) seriesMap.set(series, new Map());
    const charMap = seriesMap.get(series)!;
    if (!charMap.has(character)) charMap.set(character, []);
    charMap.get(character)!.push(item);
  }

  const albums: SeriesAlbum[] = [];

  for (const [series, charMap] of seriesMap) {
    const characters: CharacterAlbum[] = [];
    let totalImages = 0;
    // Collect any custom series cover set by any item in this series
    let seriesCustomCover = "";

    for (const [character, charItems] of charMap) {
      const imgCount = charItems.reduce((acc, i) => {
        return acc + (i.images?.length || i.image_filenames?.length || (i.image_filename ? 1 : 0));
      }, 0);
      totalImages += imgCount;

      // Prefer explicit char_cover_image, else first image
      const charCustomCover = charItems.find(i => i.char_cover_image)?.char_cover_image || "";
      if (!seriesCustomCover) {
        seriesCustomCover = charItems.find(i => i.series_cover_image)?.series_cover_image || "";
      }

      characters.push({
        character,
        slug: slugify(character),
        series,
        seriesSlug: slugify(series),
        coverImage: charCustomCover || getFirstImage(charItems[0]),
        items: charItems,
        totalImages: imgCount,
      });
    }

    characters.sort((a, b) => a.character.localeCompare(b.character));

    albums.push({
      series,
      slug: slugify(series),
      characters,
      coverImage: seriesCustomCover || characters[0]?.coverImage || "",
      totalImages,
    });
  }

  // Apply custom character order per series
  const charOrder = await getCharOrder();
  for (const album of albums) {
    const savedCharOrder = charOrder[album.slug];
    if (savedCharOrder && savedCharOrder.length > 0) {
      album.characters.sort((a, b) => {
        const ia = savedCharOrder.indexOf(a.slug);
        const ib = savedCharOrder.indexOf(b.slug);
        if (ia === -1 && ib === -1) return a.character.localeCompare(b.character);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }
  }

  // Apply custom order (saved by admin panel drag-and-drop)
  const savedOrder = await getSeriesOrder();
  if (savedOrder.length > 0) {
    albums.sort((a, b) => {
      const ia = savedOrder.indexOf(a.slug);
      const ib = savedOrder.indexOf(b.slug);
      if (ia === -1 && ib === -1) return a.series.localeCompare(b.series);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  } else {
    albums.sort((a, b) => a.series.localeCompare(b.series));
  }
  return albums;
}


export async function getSeriesBySlug(slug: string): Promise<SeriesAlbum | null> {
  const albums = await getSeriesAlbums();
  return albums.find((a) => a.slug === slug) ?? null;
}

export async function getCharacterBySlug(
  seriesSlug: string,
  charSlug: string
): Promise<CharacterAlbum | null> {
  const series = await getSeriesBySlug(seriesSlug);
  if (!series) return null;
  return series.characters.find((c) => c.slug === charSlug) ?? null;
}
