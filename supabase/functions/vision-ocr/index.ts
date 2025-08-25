import { serve } from "https://deno.land/std/http/server.ts";

// Helper: URL-safe base64 encode
function base64url(input: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...input));
  return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Create a signed JWT using a Service Account private key (PEM pkcs8)
async function createJwt(sa: any, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: sa.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const enc = (obj: unknown) => base64url(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${enc(header)}.${enc(claimSet)}`;

  // Import the private key in PKCS#8 PEM format
  const pem = sa.private_key as string;
  const pkcs8 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const signature = base64url(new Uint8Array(sigBuf));
  return `${unsigned}.${signature}`;
}

async function getAccessTokenFromSA(saJsonStr: string, scope: string): Promise<string> {
  const jwt = await createJwt(JSON.parse(saJsonStr), scope);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || "token_exchange_failed");
  return json.access_token as string;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { imageBase64, imageUrl, mime = "image/jpeg" } = await req.json().catch(() => ({}));

    const sa = Deno.env.get("GCP_SA_JSON");
    if (!sa) return new Response("Missing GCP_SA_JSON", { status: 500 });

    const token = await getAccessTokenFromSA(sa, "https://www.googleapis.com/auth/cloud-platform");

    const image = imageBase64
      ? { content: imageBase64 }
      : imageUrl
      ? { source: { imageUri: imageUrl } }
      : null;

    if (!image) return new Response("Provide imageBase64 or imageUrl", { status: 400 });

    const payload = {
      requests: [
        {
          image,
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    };

    const resp = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify(json), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const text = json?.responses?.[0]?.fullTextAnnotation?.text || "";
    return new Response(JSON.stringify({ text, raw: json }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
