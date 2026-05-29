import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const projectsManifestModule = "virtual:projects-manifest";
const resolvedProjectsManifestModule = `\0${projectsManifestModule}`;
const projectsRoot = join(__dirname, "public", "projects");

function titleFromProjectFolder(folder: string) {
  return folder
    .replace(/^\d+[-_\s]+/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function projectSortValue(folder: string) {
  const order = folder.match(/^(\d+)[-_\s]+/);
  return order ? Number(order[1]) : Number.POSITIVE_INFINITY;
}

function loadProjectsManifest() {
  return readdirSync(projectsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((folder) => existsSync(join(projectsRoot, folder, "project.md")))
    .sort((a, b) => {
      const byOrder = projectSortValue(b) - projectSortValue(a);
      return byOrder || a.localeCompare(b);
    })
    .map((folder) => ({
      path: `projects/${folder}`,
      title: titleFromProjectFolder(folder),
    }));
}

export default defineConfig({
  base: process.env.VERCEL ? "/" : "./",
  plugins: [
    react(),
    {
      name: "projects-manifest",
      configureServer(server) {
        server.watcher.add(projectsRoot);

        const refreshProjectsManifest = (path: string) => {
          if (!path.includes(`${join("public", "projects")}`) && !path.includes("/public/projects/")) {
            return;
          }

          const module = server.moduleGraph.getModuleById(resolvedProjectsManifestModule);

          if (module) {
            server.moduleGraph.invalidateModule(module);
          }

          server.ws.send({ type: "full-reload" });
        };

        server.watcher.on("add", refreshProjectsManifest);
        server.watcher.on("unlink", refreshProjectsManifest);
        server.watcher.on("addDir", refreshProjectsManifest);
        server.watcher.on("unlinkDir", refreshProjectsManifest);
      },
      resolveId(id) {
        return id === projectsManifestModule ? resolvedProjectsManifestModule : null;
      },
      load(id) {
        if (id !== resolvedProjectsManifestModule) {
          return null;
        }

        return `export default ${JSON.stringify(loadProjectsManifest(), null, 2)};`;
      },
    },
  ],
});
