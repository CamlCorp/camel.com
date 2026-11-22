// Dev-only: mounts the Agentation feedback toolbar (https://agentation.com).
// Loaded from BaseLayout behind `import.meta.env.DEV`, so it never ships in
// production builds. React is a devDependency used only here; no Astro React
// integration is needed.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

export function mountAgentation() {
  if (document.getElementById("agentation-root")) return;
  const host = document.createElement("div");
  host.id = "agentation-root";
  document.body.appendChild(host);
  createRoot(host).render(createElement(Agentation, { appName: "camel" }));
}
