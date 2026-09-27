// Diagnose: baut den bearerCheck aus toolConnectorManager.ts mit der App-env
// nach, um zu zeigen, warum github/openai im Connector-Sweep inaktiv sind.
const ZIELE = [
  ["github", "https://api.github.com/user", ["GITHUB_TOKEN", "ADMIN_GITHUB_TOKEN"]],
  ["openai", "https://api.openai.com/v1/models", ["OPENAI_API_KEY", "OPENAI_BACKUP_KEY"]],
];

for (const [name, url, keys] of ZIELE) {
  const key = keys.find((k) => (process.env[k] ?? "").trim().length > 0);
  const token = key ? process.env[key] : undefined;
  if (!token) {
    console.log(`${name}: KEIN TOKEN in env (${keys.join(", ")})`);
    continue;
  }
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const body = await res.text().catch(() => "");
    console.log(
      `${name}: key=${key} laenge=${token.length} status=${res.status} ok=${res.ok} ms=${Date.now() - t0}`,
    );
    console.log(`  body[0..120]: ${body.slice(0, 120).replace(/\s+/g, " ")}`);
  } catch (err) {
    const cause = err?.cause?.code ?? "?";
    console.log(
      `${name}: key=${key} FEHLER=${err.name}/${err.message} cause=${cause} ms=${Date.now() - t0}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

console.log("--- env-Lagen ---");
for (const k of ["GITHUB_TOKEN", "ADMIN_GITHUB_TOKEN", "OPENAI_API_KEY", "OPENAI_BACKUP_KEY"]) {
  const v = (process.env[k] ?? "").trim();
  console.log(`${k}: ${v ? `gesetzt, laenge=${v.length}` : "NICHT gesetzt"}`);
}
