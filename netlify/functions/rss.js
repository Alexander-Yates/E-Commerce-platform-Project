// netlify/functions/rss.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, context) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, created_at")
    .eq("is_approved", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return new Response("Error fetching products", { status: 500 });
  }

  const rssItems = products
    .map((p) => {
      const pubDate = new Date(p.created_at).toUTCString();
      const link = `https://doodleandstick.netlify.app/product/${p.id}`;
      return `
        <item>
          <title><![CDATA[${p.name}]]></title>
          <link>${link}</link>
          <guid>${p.id}</guid>
          <description><![CDATA[
            ${p.description || ""}
            <br/><br/>
            <strong>Price:</strong> $${p.price}
            <br/><br/>
            ${
              p.image_url
                ? `<img src="${p.image_url}" alt="${p.name}" />`
                : ""
            }
          ]]></description>
          <pubDate>${pubDate}</pubDate>
        </item>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Doodle & Stick — Latest Products</title>
      <link>https://doodleandstick.netlify.app</link>
      <description>Newly approved product listings from Doodle & Stick.</description>
      <language>en-us</language>
      ${rssItems}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml" },
  });
}
