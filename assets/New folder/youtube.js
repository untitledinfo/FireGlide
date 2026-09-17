/**
 * FireGlide — /api/youtube  (no API key, no quota, no sign-up)
 * ---------------------------------------------------------
 * Optional. The site works without this file: script.js falls back to the
 * keyless Piped API and then to the same public feeds through a CORS relay.
 * Deploying this is simply faster and most reliable, because the request
 * comes from your server instead of a shared public proxy.
 *
 * It reads the open RSS feed every YouTube channel publishes:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=UC...
 * Channel ids are pinned below (resolved once from the @handles) so the
 * handler never has to scrape a channel page to find them.
 *
 * Deploy: drop at api/youtube.js (Vercel) or netlify/functions. No env vars.
 */

const CHANNELS = [
  { handle: "@Firepdx", id: "UCqMhiwQeuH69NLRtEbg-SDg" },
  { handle: "@Glidux",  id: "UCU7K7YkRhMtCgZSc1g_ahFg" }
];
const MAX_PER_CHANNEL = 24;
const CACHE_MS = 10 * 60 * 1000; // shorter cache so live/new-upload status stays current

const cache = { at: 0, payload: null };

async function channelId(handle) {
  const known = CHANNELS.find((c) => c.handle === handle);
  if (known) return known.id;
  const res = await fetch(`https://www.youtube.com/${handle}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FireGlideBot/1.0)" }
  });
  if (!res.ok) throw new Error(`${handle} returned ${res.status}`);
  const html = await res.text();
  const m = html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/\/channel\/(UC[\w-]{22})/);
  if (!m) throw new Error(`could not resolve ${handle}`);
  return m[1];
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
};

function parseFeed(xml, creator) {
  return xml.split("<entry>").slice(1, MAX_PER_CHANNEL + 1).map((block) => {
    const videoId = tag(block, "yt:videoId");
    const title = tag(block, "title");
    const description = tag(block, "media:description").slice(0, 220);
    const views = (block.match(/views="(\d+)"/) || [])[1];
    return {
      videoId,
      creator,
      title,
      description,
      publishedAt: tag(block, "published"),
      seconds: 0,
      isShort: /#shorts?\b/i.test(title + " " + description),
      isLive: false,
      views: views ? Number(views) : null,
      thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }).filter((v) => v.videoId);
}

export default async function handler(req, res) {
  if (cache.payload && Date.now() - cache.at < CACHE_MS) {
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
    return res.status(200).json(cache.payload);
  }

  try {
    const groups = await Promise.all(CHANNELS.map(async (ch) => {
      const id = ch.id || (await channelId(ch.handle));
      const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
      if (!feed.ok) throw new Error(`feed for ${ch.handle} returned ${feed.status}`);
      return parseFeed(await feed.text(), ch.handle.replace("@", ""));
    }));

    const videos = groups.flat().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const payload = { videos, live: [], updated: new Date().toISOString() };

    cache.at = Date.now();
    cache.payload = payload;
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
    res.status(200).json(payload);
  } catch (err) {
    console.error("[api/youtube]", err.message);
    if (cache.payload) return res.status(200).json(cache.payload);
    res.status(502).json({ error: "Could not reach the YouTube feeds right now." });
  }
}
