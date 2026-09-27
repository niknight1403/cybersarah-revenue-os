import dotenv from "dotenv";

// Die Server-.env ist die autoritative Runtime-Konfiguration.
// PM2/systemd koennen veraltete Werte im Prozess-Environment behalten;
// override=true verhindert insbesondere stale DEPLOY_TOKEN/API-Key-Werte.
dotenv.config({ override: true });
