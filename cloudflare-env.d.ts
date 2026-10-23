declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MANAGER_PIN?: string;
    CREW_PIN?: string;
    SESSION_SECRET?: string;
  }
}
