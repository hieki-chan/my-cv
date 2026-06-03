import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const projectsManifestModule = "virtual:projects-manifest";
const resolvedProjectsManifestModule = `\0${projectsManifestModule}`;
const resumesManifestModule = "virtual:resumes-manifest";
const resolvedResumesManifestModule = `\0${resumesManifestModule}`;
const projectsRoot = join(__dirname, "public", "projects");
const resumesRoot = join(__dirname, "public", "resumes");

const resumeLevels = [
  {
    aliases: ["intern"],
    label: "Intern",
    tag: "Entry Level",
  },
  {
    aliases: ["fresher"],
    label: "Fresher",
    tag: "Fresher",
  },
  {
    aliases: ["junior"],
    label: "Junior",
    tag: "Junior",
  },
  {
    aliases: ["middle", "mid"],
    label: "Middle",
    tag: "Middle",
  },
  {
    aliases: ["tech-lead", "techlead", "lead"],
    label: "Tech Lead",
    tag: "Tech Lead",
  },
];

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

function normalizeResumeName(file: string) {
  return file
    .replace(/\.pdf$/i, "")
    .replace(/^resume[-_\s]*/i, "")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function loadResumesManifest() {
  if (!existsSync(resumesRoot)) {
    return [];
  }

  const filesByLevel = new Map(
    readdirSync(resumesRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      .map((entry) => [normalizeResumeName(entry.name), entry.name]),
  );

  return resumeLevels
    .map((level) => {
      const file = level.aliases
        .map((alias) => filesByLevel.get(alias))
        .find(Boolean);

      return file
        ? {
          file: `resumes/${file}`,
          label: level.label,
          tag: level.tag,
        }
        : null;
    })
    .filter(Boolean);
}

function isPathUnderPublicDir(path: string, dir: string) {
  const windowsDir = join("public", dir);
  return path.includes(windowsDir) || path.includes(`/public/${dir}/`);
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
          if (!isPathUnderPublicDir(path, "projects")) {
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
    {
      name: "resumes-manifest",
      configureServer(server) {
        server.watcher.add(resumesRoot);

        const refreshResumesManifest = (path: string) => {
          if (!isPathUnderPublicDir(path, "resumes")) {
            return;
          }

          const module = server.moduleGraph.getModuleById(resolvedResumesManifestModule);

          if (module) {
            server.moduleGraph.invalidateModule(module);
          }

          server.ws.send({ type: "full-reload" });
        };

        server.watcher.on("add", refreshResumesManifest);
        server.watcher.on("unlink", refreshResumesManifest);
      },
      resolveId(id) {
        return id === resumesManifestModule ? resolvedResumesManifestModule : null;
      },
      load(id) {
        if (id !== resolvedResumesManifestModule) {
          return null;
        }

        return `export default ${JSON.stringify(loadResumesManifest(), null, 2)};`;
      },
    },
  ],
});
