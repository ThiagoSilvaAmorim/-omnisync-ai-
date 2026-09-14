import { defineRailway, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "omnisync-api";

export default defineRailway(() => {
  const omnisyncApi = service("omnisync-api", {
    start: "sh -c \"npx prisma db push && if [ \\\"$NODE_ENV\\\" != \\\"production\\\" ]; then node prisma/seed.js; fi && node src/index.js\"",
    healthcheck: "/api/health",
    healthcheckTimeout: 100,
    // dockerfilePath from CaC: "Dockerfile"
    // builder from CaC: "DOCKERFILE"
  });
  return project("optimistic-perfection", {
    resources: [omnisyncApi],
  });
});
