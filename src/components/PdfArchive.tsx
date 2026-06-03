import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { AnnotationLayerParameters } from "pdfjs-dist/types/src/display/annotation_layer";
import type { Resume } from "../data/resumes";
import SidebarImageReveal from "./SidebarImageReveal";

type PdfArchiveProps = {
  onNavigateToPortfolio?: () => void;
  portfolioHref?: string;
  resumes: Resume[];
};

type SidebarStyle = CSSProperties & {
  "--sidebar-bg": string;
};

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function pdfWorkerUrl(version: string) {
  return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

function useDebouncedValue(value: number, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function createLinkService() {
  return {
    addLinkAttributes(link: HTMLAnchorElement, url: string) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    },
    executeNamedAction() {},
    getAnchorUrl(anchor: string) {
      return `#${anchor}`;
    },
    getDestinationHash() {
      return "#";
    },
    goToDestination() {},
  };
}

function isRenderingCancelled(error: unknown) {
  return error instanceof Error && error.name === "RenderingCancelledException";
}

export default function PdfArchive({ onNavigateToPortfolio, portfolioHref = "/portfolio", resumes }: PdfArchiveProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(resumes.length - 1, 0));
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [renderError, setRenderError] = useState("");
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const activeResume = resumes[activeIndex] ?? null;
  const debouncedViewerWidth = useDebouncedValue(viewerWidth, 140);
  const pdfStatus = useMemo(() => {
    if (renderError) {
      return renderError;
    }

    if (isLoadingPdf) {
      return "Loading PDF...";
    }

    if (isRenderingPdf) {
      return "Rendering PDF...";
    }

    return "";
  }, [isLoadingPdf, isRenderingPdf, renderError]);

  useEffect(() => {
    setActiveIndex(Math.max(resumes.length - 1, 0));
  }, [resumes]);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return undefined;
    }

    let frame = 0;
    const updateWidth = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setViewerWidth(Math.round(wrapper.clientWidth));
      });
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(wrapper);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let loadedPdf: PDFDocumentProxy | null = null;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    const container = containerRef.current;

    async function loadPdf() {
      if (!activeResume) {
        setPdfDocument(null);
        return;
      }

      setPdfDocument(null);
      setRenderError("");
      setIsLoadingPdf(true);
      if (container) {
        container.replaceChildren();
      }

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl(pdfjsLib.version);

        loadingTask = pdfjsLib.getDocument(activeResume.file);
        loadedPdf = await loadingTask.promise;

        if (isCancelled) {
          await loadedPdf.destroy();
          return;
        }

        setPdfDocument(loadedPdf);
      } catch (error) {
        if (!isCancelled && !isRenderingCancelled(error)) {
          setRenderError("Unable to load this PDF.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      loadingTask?.destroy?.();
      loadedPdf?.destroy?.();
      if (container) {
        container.replaceChildren();
      }
    };
  }, [activeResume]);

  useEffect(() => {
    let isCancelled = false;
    const renderTasks: RenderTask[] = [];
    const container = containerRef.current;

    async function renderPdf() {
      if (!container || !pdfDocument || !debouncedViewerWidth) {
        return;
      }

      container.replaceChildren();
      setRenderError("");
      setIsRenderingPdf(true);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        const linkService = createLinkService();
        const pdfLinkService = linkService as unknown as AnnotationLayerParameters["linkService"];
        const availableWidth = Math.max(320, debouncedViewerWidth - 32);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum += 1) {
          if (isCancelled) {
            return;
          }

          const page = await pdfDocument.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.5, availableWidth / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const pageElement = document.createElement("div");
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not create a PDF canvas context.");
          }

          pageElement.className = "pdf-page";
          pageElement.style.width = `${viewport.width}px`;
          pageElement.style.height = `${viewport.height}px`;
          pageElement.style.setProperty("--total-scale-factor", `${scale}`);
          pageElement.style.setProperty("--scale-round-x", "1px");
          pageElement.style.setProperty("--scale-round-y", "1px");

          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";

          pageElement.appendChild(canvas);
          container.appendChild(pageElement);

          const renderTask = page.render({
            canvasContext: context,
            canvas,
            viewport,
            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          renderTasks.push(renderTask);
          await renderTask.promise;

          const annotations = await page.getAnnotations({ intent: "display" });

          if (isCancelled || annotations.length === 0) {
            continue;
          }

          const annotationLayerElement = document.createElement("div");
          annotationLayerElement.className = "annotationLayer";
          annotationLayerElement.style.setProperty("--total-scale-factor", `${scale}`);
          annotationLayerElement.style.setProperty("--scale-round-x", "1px");
          annotationLayerElement.style.setProperty("--scale-round-y", "1px");
          pageElement.appendChild(annotationLayerElement);

          const annotationLayer = new pdfjsLib.AnnotationLayer({
            div: annotationLayerElement,
            linkService,
            page,
            viewport: viewport.clone({ dontFlip: true }),
            accessibilityManager: undefined,
            annotationCanvasMap: undefined,
            annotationEditorUIManager: undefined,
            annotationStorage: undefined,
            commentManager: undefined,
            structTreeLayer: undefined,
          });

          await annotationLayer.render({
            annotations,
            div: annotationLayerElement,
            fieldObjects: null,
            hasJSActions: false,
            imageResourcesPath: "",
            linkService: pdfLinkService,
            page,
            renderForms: false,
            viewport: viewport.clone({ dontFlip: true }),
          });
        }
      } catch (error) {
        if (!isCancelled && !isRenderingCancelled(error)) {
          setRenderError("Unable to render this PDF.");
        }
      } finally {
        if (!isCancelled) {
          setIsRenderingPdf(false);
        }
      }
    }

    renderPdf();

    return () => {
      isCancelled = true;
      renderTasks.forEach((task) => task.cancel?.());
      if (container) {
        container.replaceChildren();
      }
    };
  }, [debouncedViewerWidth, pdfDocument]);

  const sidebarStyle: SidebarStyle = {
    "--sidebar-bg": `url("${publicAsset("bg_left.jpg")}")`,
  };
  const sidebarBackground = `url("${publicAsset("bg_left.jpg")}")`;

  return (
    <main className="layout">
      <aside
        className={[
          "sidebar",
          isSidebarCollapsed ? "collapsed" : "",
        ].filter(Boolean).join(" ")}
        style={sidebarStyle}
      >
        <SidebarImageReveal image={sidebarBackground} />
        <div className="cv-list">
          {resumes.length === 0 ? (
            <div className="loading-state">No CV files found</div>
          ) : (
            resumes.map((cv, index) => (
              <button
                className={`cv-item${index === activeIndex ? " active" : ""}`}
                key={cv.file}
                onClick={() => setActiveIndex(index)}
                style={{ "--item-index": index } as CSSProperties}
                type="button"
              >
                <span className="cv-name">{cv.label}</span>
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">Kieu Minh Hieu</div>
      </aside>

      <section className="viewer">
        <div className="anime-nav">
          <nav className="anime-nav-lines" aria-label="Main navigation">
            <ul className="anime-nav-list">
              <li className="anime-nav-item">
                <p><span>PORTFOLIO</span></p>
                <a
                  href={portfolioHref}
                  onClick={(event) => {
                    if (!onNavigateToPortfolio) {
                      return;
                    }

                    event.preventDefault();
                    onNavigateToPortfolio();
                  }}
                />
              </li>
              <li className="anime-nav-item">
                <p><span>RSS</span></p>
                <a href="/rss.xml" rel="noreferrer" target="_blank" />
              </li>
              {activeResume ? (
                <li className="anime-nav-item">
                  <p><span>DOWNLOAD</span></p>
                  <a download href={activeResume.file} />
                </li>
              ) : null}
              {activeResume ? (
                <li className="anime-nav-item">
                  <p><span>OPEN</span></p>
                  <a href={activeResume.file} rel="noreferrer" target="_blank" />
                </li>
              ) : null}
            </ul>
          </nav>
        </div>

        {!activeResume ? <div className="empty-viewer">SELECT FILE</div> : null}

        <div className="pdf-wrapper" ref={wrapperRef}>
          <div className="pdf-bg">
            {pdfStatus ? <div className="pdf-state">{pdfStatus}</div> : null}
            <div id="pdf-container" ref={containerRef} />
          </div>
        </div>
      </section>
    </main>
  );
}
