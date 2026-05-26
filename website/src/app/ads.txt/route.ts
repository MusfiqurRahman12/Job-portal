export async function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) {
    return new Response("# Google AdSense is not configured", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // Google ads.txt needs the publisher ID without the "ca-" prefix (e.g., pub-xxxxxxxxxxxxxxxx)
  const publisherId = client.replace(/^ca-/, "");

  const content = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
export const dynamic = "force-dynamic";
