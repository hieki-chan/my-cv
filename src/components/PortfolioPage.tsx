import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import MarkdownRenderer from "./MarkdownRenderer";
import projectsManifest from "virtual:projects-manifest";
import { site } from "../data/site";

type PortfolioPageProps = {
  onNavigateToResumes: () => void;
  resumeHref: string;
};

type ProjectManifestItem = {
  path: string;
  title: string;
};

type Project = ProjectManifestItem & {
  assetBase: string;
  content: string;
  slug: string;
  summary: string;
  time?: string;
  title: string;
};

const heroSlices = Array.from({ length: 8 });

function resolvePublicPath(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${path}`;
}

function projectBase(path: string) {
  return path.split("/").slice(0, -1).join("/");
}

function normalizeProjectPath(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}

function projectMarkdownPath(path: string) {
  return `${normalizeProjectPath(path)}/project.md`;
}

function projectSlug(path: string) {
  return normalizeProjectPath(path).split("/").filter(Boolean).at(-1) ?? "project";
}

function summaryFromMarkdown(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith("!") && !block.startsWith("```"))
    ?.replace(/\s+/g, " ")
    ?? "";
}

function stripTitleHeading(markdown: string) {
  return markdown.replace(/^#\s+.+\n+/, "");
}

function extractProjectContent(markdown: string) {
  const contentWithoutTitle = stripTitleHeading(markdown);
  const lines = contentWithoutTitle.replace(/\r\n/g, "\n").split("\n");
  let time = "";
  const contentLines = lines.filter((line) => {
    const timeMatch = line.trim().match(/^(?:time|date|published):\s*(.+)$/i);

    if (timeMatch && !time) {
      time = timeMatch[1].trim();
      return false;
    }

    return true;
  });

  return {
    content: contentLines.join("\n").trimStart(),
    time,
  };
}

function ProjectArticle({ index, project }: { index: number; project: Project }) {
  const articleRef = useRef<HTMLElement | null>(null);

  return (
    <motion.article
      className="portfolio-project"
      data-index={String(index + 1).padStart(2, "0")}
      id={project.slug}
      initial={{ clipPath: "inset(0 0 18% 0)", opacity: 0, y: 78 }}
      ref={articleRef}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ clipPath: "inset(0 0 0% 0)", opacity: 1, y: 0 }}
    >
      <div className="portfolio-project-content">
        <header className="portfolio-project-header">
          <div className="portfolio-project-meta">
            <span>{String(index + 1).padStart(2, "0")} / PROJECT</span>
            {project.time ? <time>{project.time}</time> : null}
          </div>
          <h2>{project.title}</h2>
          {project.summary ? <p>{project.summary}</p> : null}
        </header>
        <MarkdownRenderer assetBase={project.assetBase} markdown={project.content} />
      </div>
    </motion.article>
  );
}

export default function PortfolioPage({ onNavigateToResumes, resumeHref }: PortfolioPageProps) {
  const pageRef = useRef<HTMLElement | null>(null);
  const [activeProject, setActiveProject] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("Loading projects...");
  const { scrollYProgress } = useScroll({ container: pageRef });
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, -140]);
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProjects() {
      setStatus("Loading projects...");

      try {
        const loadedProjects = await Promise.all(projectsManifest.map(async (project) => {
          const markdownPath = resolvePublicPath(projectMarkdownPath(project.path));
          const markdownResponse = await fetch(markdownPath);

          if (!markdownResponse.ok) {
            throw new Error(`${projectMarkdownPath(project.path)} returned ${markdownResponse.status}.`);
          }

          const content = await markdownResponse.text();
          const slug = projectSlug(project.path);
          const projectContent = extractProjectContent(content);

          return {
            ...project,
            assetBase: projectBase(markdownPath),
            content: projectContent.content,
            slug,
            summary: summaryFromMarkdown(projectContent.content),
            time: projectContent.time,
            title: project.title,
          };
        }));

        if (!isCancelled) {
          setProjects(loadedProjects);
          setActiveProject(loadedProjects[0]?.slug ?? "");
          setStatus("");
        }
      } catch {
        if (!isCancelled) {
          setStatus("Unable to load projects.");
        }
      }
    }

    loadProjects();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const scrollRoot = pageRef.current;

    if (projects.length === 0 || !scrollRoot) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target.id) {
        setActiveProject(visible.target.id);
      }
    }, {
      root: scrollRoot,
      rootMargin: "-22% 0px -52% 0px",
      threshold: [0.08, 0.18, 0.32, 0.48, 0.64],
    });

    projects.forEach((project) => {
      const element = document.getElementById(project.slug);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [projects]);

  function navigateToProject(slug: string) {
    setActiveProject(slug);
    document.getElementById(slug)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="portfolio-page" ref={pageRef}>
      <div className="anime-nav portfolio-nav">
        <nav className="anime-nav-lines" aria-label="Portfolio navigation">
          <ul className="anime-nav-list">
            <li className="anime-nav-item">
              <p><span>CV</span></p>
              <a
                href={resumeHref}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigateToResumes();
                }}
              />
            </li>
            <li className="anime-nav-item">
              <p><span>RSS</span></p>
              <a href={site.rssFeed} rel="noreferrer" target="_blank" />
            </li>
          </ul>
        </nav>
      </div>

      <section className="portfolio-hero">
        <motion.div
          className="portfolio-hero-bg"
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
          }}
        />
        <div className="portfolio-hero-slices" aria-hidden="true">
          {heroSlices.map((_, index) => (
            <motion.span
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: [0, 1, 0.54] }}
              initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              key={index}
              transition={{
                delay: 0.28 + index * 0.055,
                duration: 0.82,
                ease: [0.76, 0, 0.24, 1],
              }}
            />
          ))}
        </div>
        <motion.div
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          className="portfolio-hero-sigil"
          initial={{ opacity: 0, rotate: -18, scale: 0.84 }}
          transition={{ delay: 0.42, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.i
            animate={{ opacity: [0.16, 0.8, 0.16], scaleX: [0.72, 1, 0.72] }}
            transition={{ duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="portfolio-hero-copy"
          initial={{ opacity: 0, y: 42 }}
          transition={{ delay: 0.32, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="portfolio-hero-heading">
            <span className="portfolio-kicker">KIEU MINH HIEU / PORTFOLIO</span>
            <h1>Projects</h1>
          </div>
          <div className="portfolio-hero-meta">
            <p>
              A portfolio of the projects I have built and the work I am proud to share.
            </p>
          </div>
        </motion.div>
        <div className="portfolio-scroll-cue">SCROLL</div>
      </section>

      <section className="portfolio-projects-shell" aria-label="Projects">
        {status ? <div className="pdf-state">{status}</div> : null}

        {projects.length ? (
          <>
            <label className="portfolio-project-select">
              <span>PROJECT</span>
              <select
                aria-label="Jump to project"
                onChange={(event) => navigateToProject(event.target.value)}
                value={activeProject}
              >
                {projects.map((project, index) => (
                  <option key={project.slug} value={project.slug}>
                    {String(index + 1).padStart(2, "0")} / {project.title}
                  </option>
                ))}
              </select>
            </label>

            <aside className="portfolio-project-toc" aria-label="Project table of contents">
              <span>PROJECTS</span>
              {projects.map((project, index) => (
                <a
                  aria-current={activeProject === project.slug ? "location" : undefined}
                  className={activeProject === project.slug ? "active" : ""}
                  href={`#${project.slug}`}
                  key={project.slug}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToProject(project.slug);
                  }}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  {project.title}
                </a>
              ))}
            </aside>

            <div className="portfolio-project-feed">
              {projects.map((project, index) => (
                <ProjectArticle index={index} key={project.slug} project={project} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
