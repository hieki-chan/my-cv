import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import MarkdownRenderer from "./MarkdownRenderer";
import { site } from "../data/site";

type PortfolioPageProps = {
  onNavigateToResumes: () => void;
  resumeHref: string;
};

type ProjectManifestItem = {
  cover?: string;
  markdown: string;
  slug: string;
  stack?: string[];
  summary: string;
  title: string;
  year?: string;
};

type Project = ProjectManifestItem & {
  assetBase: string;
  content: string;
};

const introLetters = "KIEU MINH HIEU".split("");
const heroSlices = Array.from({ length: 8 });

function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function resolvePublicPath(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${path}`;
}

function projectBase(path: string) {
  return path.split("/").slice(0, -1).join("/");
}

function PortfolioIntro() {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ clipPath: "inset(0 0 100% 0)", pointerEvents: "none" }}
      className="portfolio-intro"
      initial={{ clipPath: "inset(0 0 0% 0)" }}
      transition={{ delay: 1.82, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="portfolio-intro-lockup"
        initial={{ opacity: 0, y: 18 }}
        transition={{ delay: 0.18, duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="portfolio-intro-mark">
          {introLetters.map((letter, index) => (
            <motion.span
              animate={{ opacity: letter === " " ? 0.5 : 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              key={`${letter}-${index}`}
              transition={{ delay: 0.3 + index * 0.028, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {letter === " " ? "\u00a0" : letter}
            </motion.span>
          ))}
        </div>
        <div className="portfolio-intro-line" aria-hidden="true">
          <motion.span
            animate={{ scaleX: 1 }}
            initial={{ scaleX: 0 }}
            transition={{ delay: 0.26, duration: 1.18, ease: [0.76, 0, 0.24, 1] }}
          />
        </div>
        <motion.div
          animate={{ opacity: 1 }}
          className="portfolio-intro-sub"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.72, duration: 0.42, ease: "easeOut" }}
        >
          PORTFOLIO
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function ProjectArticle({ index, project }: { index: number; project: Project }) {
  const articleRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: articleRef, offset: ["start end", "end start"] });
  const coverY = useTransform(scrollYProgress, [0, 1], [-46, 46]);
  const coverScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 1.08]);
  const cover = project.cover ? resolvePublicPath(project.cover) : asset("bg_left.jpg");

  return (
    <motion.article
      className="portfolio-project"
      id={project.slug}
      initial={{ clipPath: "inset(0 0 18% 0)", opacity: 0, y: 78 }}
      ref={articleRef}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ clipPath: "inset(0 0 0% 0)", opacity: 1, y: 0 }}
    >
      <div className="portfolio-project-cover">
        <motion.div
          className="portfolio-project-cover-image"
          style={{ backgroundImage: `url("${cover}")`, scale: coverScale, y: coverY }}
        />
        <div className="portfolio-project-cover-lines" aria-hidden="true" />
        <div className="portfolio-project-index">{String(index + 1).padStart(2, "0")}</div>
      </div>

      <div className="portfolio-project-content">
        <header className="portfolio-project-header">
          <span>{project.year ?? "Project"}</span>
          <h2>{project.title}</h2>
          <p>{project.summary}</p>
          {project.stack?.length ? (
            <ul className="portfolio-project-stack">
              {project.stack.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
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
        const manifestResponse = await fetch(site.projectsManifest);

        if (!manifestResponse.ok) {
          throw new Error(`Projects manifest returned ${manifestResponse.status}.`);
        }

        const manifest = await manifestResponse.json() as ProjectManifestItem[];
        const loadedProjects = await Promise.all(manifest.map(async (project) => {
          const markdownPath = resolvePublicPath(project.markdown);
          const markdownResponse = await fetch(markdownPath);

          if (!markdownResponse.ok) {
            throw new Error(`${project.markdown} returned ${markdownResponse.status}.`);
          }

          return {
            ...project,
            assetBase: projectBase(markdownPath),
            content: await markdownResponse.text(),
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
      <PortfolioIntro />
      <nav className="portfolio-topbar" aria-label="Portfolio navigation">
        <a
          href={resumeHref}
          onClick={(event) => {
            event.preventDefault();
            onNavigateToResumes();
          }}
        >
          CV
        </a>
        <a href={site.rssFeed} rel="noreferrer" target="_blank">RSS</a>
      </nav>

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
                delay: 2.02 + index * 0.075,
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
          transition={{ delay: 2.18, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
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
          transition={{ delay: 2.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="portfolio-hero-heading">
            <span className="portfolio-kicker">KIEU MINH HIEU / PORTFOLIO</span>
            <h1>Projects</h1>
          </div>
          <div className="portfolio-hero-meta">
            <p>
              A portfolio of the projects I have built and the work I am proud to share.
            </p>
            <div className="portfolio-hero-list" aria-hidden="true">
              {projects.slice(0, 3).map((project, index) => (
                <span key={project.slug}>
                  {String(index + 1).padStart(2, "0")} / {project.title}
                </span>
              ))}
            </div>
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
