async function compress(str) {
  const bytes = new TextEncoder().encode(str);
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  const raw = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < raw.byteLength; i++) binary += String.fromCharCode(raw[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function decompress(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function generateShareUrl(trip) {
  const encoded = await compress(JSON.stringify(trip));
  const base = window.location.href.split("#")[0];
  return `${base}#trip=${encoded}`;
}

export async function loadTripFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#trip=")) return null;
  const encoded = hash.slice(6);
  try {
    const json = await decompress(encoded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
