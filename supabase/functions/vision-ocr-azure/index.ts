import { serve } from "https://deno.land/std/http/server.ts";

// Secrets are read from environment variables set via Supabase:
//   AZURE_VISION_ENDPOINT (e.g. https://<resource>.services.ai.azure.com/)
//   AZURE_VISION_KEY (Azure AI Foundry primary key)

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { imageBase64, imageUrl, mime = "image/jpeg" } = await req.json().catch(() => ({}));

    const endpoint = Deno.env.get("AZURE_VISION_ENDPOINT");
    const key = Deno.env.get("AZURE_VISION_KEY");
    if (!endpoint || !key) {
      return new Response("Missing AZURE_VISION_ENDPOINT or AZURE_VISION_KEY", { status: 500 });
    }

    // Use Azure AI Content Understanding (Foundry) API
    const base = endpoint.replace(/\/$/, "");
    const analyzerId = "prebuilt-documentAnalyzer";
    const apiVersion = "2025-05-01-preview";
    const analyzeUrl = `${base}/contentunderstanding/analyzers/${analyzerId}:analyze?api-version=${apiVersion}`;

    let start: Response;
    if (imageUrl) {
      // JSON payload with public URL
      start = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: imageUrl }),
      });
    } else if (imageBase64) {
      // Try binary body directly (some regions accept direct file bytes)
      const buffer = Uint8Array.from(atob(String(imageBase64)), (c) => c.charCodeAt(0));
      start = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": mime || "application/octet-stream",
        },
        body: buffer,
      });
    } else {
      return new Response("Provide imageBase64 or imageUrl", { status: 400 });
    }

    if (start.status !== 202) {
      const bodyText = await start.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Analyze start failed", status: start.status, body: bodyText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const opLoc = start.headers.get("Operation-Location") || start.headers.get("operation-location");
    if (!opLoc) return new Response("Missing Operation-Location header", { status: 500 });

    // Poll for result
    let result: any = null;
    for (let i = 0; i < 20; i++) {
      await sleep(i === 0 ? 1000 : 1200);
      const poll = await fetch(opLoc, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
      const j = await poll.json().catch(() => ({}));
      const status = j?.status || j?.result?.status;
      if ((j && j.status === "Succeeded") || status === "Succeeded") {
        result = j;
        break;
      }
      if ((j && j.status === "Failed") || status === "Failed") {
        return new Response(JSON.stringify(j), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (!result) return new Response("Timed out waiting for Content Understanding result", { status: 504 });

    // Extract text from markdown of first content item
    const contents = result?.result?.contents || result?.contents || [];
    let markdown = "";
    if (Array.isArray(contents) && contents.length) {
      for (const c of contents) {
        if (c && typeof c.markdown === "string") {
          markdown += (markdown ? "\n\n" : "") + c.markdown;
        }
      }
    }
    const text = markdown || "";

    return new Response(JSON.stringify({ text, raw: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
