/**
 * SEO Blog Routes — Öffentlich crawlbare Blog-Seiten für cybersarah.app
 * 
 * Fügt hinzu:
 * - /blog                    → Blog-Übersicht (alle Artikel)
 * - /blog/:slug              → Einzelner Artikel (SEO-optimiert)
 * - /sitemap.xml             → XML-Sitemap für Google
 * - /robots.txt              → Robots-Datei
 * 
 * Integration: In routes/index.ts als app.use("/api", seoBlogRouter) einbinden.
 * Nginx: /blog/* → localhost:3000/api/blog/* weiterleiten.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { seoContentTable, produkteTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

const router = Router();
const PUBLIC_APP_URL = process.env["PUBLIC_APP_URL"] ?? "https://cybersarah.app";

// ─── HTML-Template für Blog-Seiten ──────────────────────────────────────────

function renderBlogLayout(options: {
  title: string;
  description: string;
  canonicalUrl: string;
  bodyHtml: string;
  noIndex?: boolean;
}): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(options.title)}</title>
<meta name="description" content="${escape(options.description)}" />
<link rel="canonical" href="${options.canonicalUrl}" />
${options.noIndex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow" />'}
<meta property="og:title" content="${escape(options.title)}" />
<meta property="og:description" content="${escape(options.description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${options.canonicalUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; line-height: 1.7; }
  .container { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
  .header { background: linear-gradient(135deg, #1a0a2e, #0d0d1a); padding: 3rem 0; text-align: center; border-bottom: 1px solid #2a1a4e; }
  .header h1 { font-size: 2.2rem; background: linear-gradient(90deg, #a855f7, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header p { color: #9ca3af; margin-top: 0.5rem; font-size: 1.1rem; }
  .nav { padding: 1rem 0; border-bottom: 1px solid #1f1f2e; text-align: center; }
  .nav a { color: #a855f7; text-decoration: none; margin: 0 1rem; font-weight: 500; }
  .nav a:hover { color: #06b6d4; }
  article { padding: 2rem 0; }
  article h1 { font-size: 1.8rem; margin-bottom: 1rem; color: #f0f0f0; }
  article h2 { font-size: 1.4rem; margin: 2rem 0 0.8rem; color: #c084fc; border-left: 3px solid #a855f7; padding-left: 0.8rem; }
  article h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; color: #06b6d4; }
  article p { margin-bottom: 1rem; }
  article a { color: #a855f7; }
  .blog-list { display: grid; gap: 1.5rem; padding: 2rem 0; }
  .blog-card { background: #111118; border: 1px solid #1f1f2e; border-radius: 12px; padding: 1.5rem; transition: border-color 0.2s; }
  .blog-card:hover { border-color: #a855f7; }
  .blog-card h2 { font-size: 1.2rem; margin-bottom: 0.5rem; }
  .blog-card h2 a { color: #f0f0f0; text-decoration: none; }
  .blog-card h2 a:hover { color: #a855f7; }
  .blog-card .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 0.5rem; }
  .blog-card .excerpt { color: #9ca3af; font-size: 0.95rem; }
  .cta-box { background: linear-gradient(135deg, #1a0a2e, #0d1a2e); border: 1px solid #2a1a4e; border-radius: 12px; padding: 2rem; margin: 2rem 0; text-align: center; }
  .cta-box h3 { color: #a855f7; margin-bottom: 0.8rem; }
  .cta-btn { display: inline-block; background: linear-gradient(90deg, #a855f7, #06b6d4); color: #fff; padding: 0.8rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem; }
  footer { border-top: 1px solid #1f1f2e; padding: 2rem 0; text-align: center; color: #6b7280; font-size: 0.85rem; }
</style>
</head>
<body>
<div class="header">
  <div class="container">
    <h1>CyberSarah Blog</h1>
    <p>KI-Tools, Automatisierung & Online-Geldverdienen</p>
  </div>
</div>
<div class="nav">
  <a href="/blog">Blog</a>
  <a href="/blog?marke=CyberSarah">CyberSarah</a>
  <a href="/blog?marke=GeldPilot AI">GeldPilot AI</a>
  <a href="/blog?marke=UnternehmerGPT">UnternehmerGPT</a>
</div>
<div class="container">
${options.bodyHtml}
</div>
<footer>
  <div class="container">
    &copy; ${new Date().getFullYear()} CyberSarah Revenue OS &middot; KI-gestützte Automatisierung
  </div>
</footer>
</body>
</html>`;
}

// ─── Blog-Übersicht ─────────────────────────────────────────────────────────

router.get("/blog", async (req, res) => {
  try {
    const marke = req.query["marke"] as string | undefined;
    const conditions = [eq(seoContentTable.status, "veroeffentlicht")];
    if (marke) conditions.push(eq(seoContentTable.marke, marke));

    const artikel = await db
      .select()
      .from(seoContentTable)
      .where(and(...conditions))
      .orderBy(desc(seoContentTable.veroeffentlichtAm))
      .limit(50);

    const cardsHtml = artikel
      .map((a) => {
        const datum = a.veroeffentlichtAm
          ? new Date(a.veroeffentlichtAm).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
          : "";
        const excerpt = (a.metaDescription ?? a.body ?? "").slice(0, 160);
        return `<div class="blog-card">
  <div class="meta">${a.marke} &middot; ${datum}</div>
  <h2><a href="/blog/${a.slug}">${a.titel}</a></h2>
  <p class="excerpt">${excerpt}...</p>
</div>`;
      })
      .join("\n");

    const bodyHtml = cardsHtml.length > 0
      ? `<h2 style="color:#a855f7; margin: 1.5rem 0;">Neueste Artikel</h2>\n<div class="blog-list">${cardsHtml}</div>`
      : '<p style="text-align:center; color:#6b7280; padding: 3rem 0;">Noch keine Artikel vorhanden. Die KI-Agenten arbeiten daran!</p>';

    const title = marke ? `Blog — ${marke}` : "Blog — KI & Automatisierung";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderBlogLayout({
      title,
      description: "Aktuelle Artikel zu KI-Tools, Automatisierung und Online-Geldverdienen",
      canonicalUrl: `${PUBLIC_APP_URL}/blog`,
      bodyHtml,
    }));
  } catch (err) {
    req.log.error({ err }, "Fehler beim Blog-Laden");
    res.status(500).send("<h1>Fehler</h1>");
  }
});

// ─── Einzelner Artikel ──────────────────────────────────────────────────────

router.get("/blog/:slug", async (req, res) => {
  try {
    const [artikel] = await db
      .select()
      .from(seoContentTable)
      .where(and(
        eq(seoContentTable.slug, req.params["slug"] ?? ""),
        eq(seoContentTable.status, "veroeffentlicht"),
      ))
      .limit(1);

    if (!artikel) {
      res.status(404).send(renderBlogLayout({
        title: "Artikel nicht gefunden — CyberSarah Blog",
        description: "Der gesuchte Artikel existiert nicht.",
        canonicalUrl: `${PUBLIC_APP_URL}/blog`,
        bodyHtml: '<p style="text-align:center; padding: 3rem 0;">Artikel nicht gefunden.</p>',
        noIndex: true,
      }));
      return;
    }

    // Aufrufe zählen
    await db
      .update(seoContentTable)
      .set({ aufrufe: artikel.aufrufe + 1 })
      .where(eq(seoContentTable.id, artikel.id));

    // Markdown-ähnlichen Body zu HTML konvertieren
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const bodyHtml = (artikel.body ?? "")
      .split("\n\n")
      .map((absatz) => {
        if (absatz.startsWith("## ")) return `<h2>${escape(absatz.replace(/^## /, ""))}</h2>`;
        if (absatz.startsWith("### ")) return `<h3>${escape(absatz.replace(/^### /, ""))}</h3>`;
        if (absatz.startsWith("**") && absatz.endsWith("**")) {
          return `<p><strong>${escape(absatz.replace(/\*\*/g, ""))}</strong></p>`;
        }
        if (absatz.startsWith("---")) return '<hr style="border-color: #1f1f2e; margin: 2rem 0;">';
        // Links erkennen
        const mitLinks = escape(absatz).replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener">$1</a>',
        );
        return `<p>${mitLinks.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");

    // CTA Box wenn Produkt verlinkt
    const ctaHtml = artikel.produktId
      ? `<div class="cta-box">
  <h3>🚀 Bereit loszulegen?</h3>
  <p>Dieser Artikel ist Teil unseres CyberSarah Revenue OS — dem autonomen KI-System für Online-Umsatz.</p>
  <a href="${PUBLIC_APP_URL}" class="cta-btn">Jetzt starten</a>
</div>`
      : "";

    const datum = artikel.veroeffentlichtAm
      ? new Date(artikel.veroeffentlichtAm).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
      : "";

    const fullBody = `<article>
  <div style="color:#6b7280; font-size: 0.9rem; margin-bottom: 1rem;">${artikel.marke} &middot; ${datum} &middot; ${artikel.aufrufe + 1} Aufrufe</div>
  <h1>${escape(artikel.titel)}</h1>
  ${bodyHtml}
</article>
${ctaHtml}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderBlogLayout({
      title: `${artikel.titel} — CyberSarah Blog`,
      description: artikel.metaDescription ?? artikel.titel,
      canonicalUrl: `${PUBLIC_APP_URL}/blog/${artikel.slug}`,
      bodyHtml: fullBody,
    }));
  } catch (err) {
    req.log.error({ err }, "Fehler beim Artikel-Laden");
    res.status(500).send("<h1>Fehler</h1>");
  }
});

// ─── XML-Sitemap ────────────────────────────────────────────────────────────

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const artikel = await db
      .select({ slug: seoContentTable.slug, veroeffentlichtAm: seoContentTable.veroeffentlichtAm })
      .from(seoContentTable)
      .where(eq(seoContentTable.status, "veroeffentlicht"))
      .orderBy(desc(seoContentTable.veroeffentlichtAm));

    const urls = artikel
      .map((a) => {
        const lastmod = a.veroeffentlichtAm
          ? new Date(a.veroeffentlichtAm).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        return `  <url>
    <loc>${PUBLIC_APP_URL}/blog/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_APP_URL}/blog</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${PUBLIC_APP_URL}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(xml);
  } catch (err) {
    res.status(500).send("<?xml version='1.0'?><error/>");
  }
});

// ─── Robots.txt ─────────────────────────────────────────────────────────────

router.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *
Allow: /blog
Allow: /sitemap.xml
Disallow: /api/
Disallow: /settings

Sitemap: ${PUBLIC_APP_URL}/sitemap.xml
`);
});

// ─── JSON-LD Structured Data für Google Rich Results ─────────────────────────

router.get("/blog/:slug/structured", async (req, res) => {
  try {
    const [artikel] = await db
      .select()
      .from(seoContentTable)
      .where(and(
        eq(seoContentTable.slug, req.params["slug"] ?? ""),
        eq(seoContentTable.status, "veroeffentlicht"),
      ))
      .limit(1);

    if (!artikel) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: artikel.titel,
      description: artikel.metaDescription,
      author: { "@type": "Organization", name: artikel.marke },
      publisher: { "@type": "Organization", name: "CyberSarah" },
      url: `${PUBLIC_APP_URL}/blog/${artikel.slug}`,
      datePublished: artikel.veroeffentlichtAm?.toISOString(),
      mainEntityOfPage: `${PUBLIC_APP_URL}/blog/${artikel.slug}`,
    };

    res.json(structuredData);
  } catch {
    res.status(500).json({ error: "Fehler" });
  }
});

export default router;
