import { getSeriesBySlug, getSeriesAlbums } from "@/lib/data";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Images } from "lucide-react";

export const revalidate = 0;

export async function generateStaticParams() {
  const albums = await getSeriesAlbums();
  return albums.map((a) => ({ series: a.slug }));
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series: seriesSlug } = await params;
  const album = await getSeriesBySlug(seriesSlug);
  if (!album) notFound();

  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

  return (
    <main style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 56px) clamp(24px, 5vw, 48px)",
        }}
      >
        {/* Breadcrumb */}
        <nav
          className="anim-fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "13px",
            color: "var(--text-3)",
            marginBottom: "var(--space-6)",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>
          <ChevronRight style={{ width: "12px", height: "12px", flexShrink: 0 }} />
          <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{album.series}</span>
        </nav>

        {/* Title row */}
        <div
          className="anim-fade-up anim-delay-1"
          style={{ marginBottom: "clamp(32px, 5vw, 48px)" }}
        >
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              marginBottom: "var(--space-2)",
              lineHeight: 1.15,
            }}
          >
            {album.series}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-3)" }}>
            {album.characters.length} character{album.characters.length !== 1 ? "s" : ""}
            &ensp;·&ensp;
            {album.totalImages} image{album.totalImages !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Characters — 4 columns on desktop */}
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: "var(--space-5)",
          }}
        >
          Characters
        </p>

        <div
          className="char-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-4)",
          }}
        >
          {album.characters.map((char, i) => {
            const coverUrl = char.coverImage ? `${r2}/images/${char.coverImage}` : null;
            const delay = Math.min(i * 55, 400);
            return (
              <Link
                key={char.slug}
                href={`/series/${seriesSlug}/${char.slug}`}
                className="card-lift pressable anim-fade-up"
                style={{
                  display: "block",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  textDecoration: "none",
                  animationDelay: `${delay}ms`,
                }}
              >
                {/* Portrait 3:4 */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3 / 4",
                    background: "var(--bg-subtle)",
                    overflow: "hidden",
                  }}
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={char.character}
                      fill
                      style={{ objectFit: "cover", objectPosition: "top" }}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Images style={{ width: "24px", height: "24px", color: "var(--border-hi)" }} />
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, var(--bg-raised) 0%, transparent 55%)",
                    }}
                  />
                </div>

                {/* Name */}
                <div style={{ padding: "var(--space-3) var(--space-4) var(--space-4)" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "var(--text)",
                      lineHeight: 1.3,
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {char.character}
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--text-3)" }}>
                    {char.totalImages} image{char.totalImages !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

