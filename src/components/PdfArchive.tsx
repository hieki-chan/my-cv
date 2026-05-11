import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { AnnotationLayerParameters } from "pdfjs-dist/types/src/display/annotation_layer";
import type { Resume } from "../data/resumes";

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 360;

type PdfArchiveProps = {
  resumes: Resume[];
};

type SidebarStyle = CSSProperties & {
  "--sidebar-bg": string;
  "--sidebar-w": string;
};

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export default function PdfArchive({ resumes }: PdfArchiveProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [renderError, setRenderError] = useState("");
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const resizeStartRef = useRef({ pointerX: 0, width: DEFAULT_SIDEBAR_WIDTH });

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

  const startSidebarResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isSidebarCollapsed) {
      return;
    }

    resizeStartRef.current = {
      pointerX: event.clientX,
      width: sidebarWidth,
    };
    setIsResizingSidebar(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isSidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStartRef.current.pointerX;
      setSidebarWidth(clamp(
        resizeStartRef.current.width + delta,
        MIN_SIDEBAR_WIDTH,
        MAX_SIDEBAR_WIDTH,
      ));
    };

    const stopResize = () => setIsResizingSidebar(false);

    document.body.classList.add("is-sidebar-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });

    return () => {
      document.body.classList.remove("is-sidebar-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [isResizingSidebar]);

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
        pdfjsLib.GlobalWorkerOptions.workerSrc = publicAsset("pdf.worker.min.mjs");

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
    "--sidebar-w": `${sidebarWidth}px`,
  };

  return (
    <main className="layout">
      <aside
        className={[
          "sidebar",
          isSidebarCollapsed ? "collapsed" : "",
          isResizingSidebar ? "is-resizing" : "",
        ].filter(Boolean).join(" ")}
        style={sidebarStyle}
      >
        <div className="sidebar-header">
          <div className="header-content">
            <h1>RESUME</h1>
            <h1>ARCHIVE</h1>
            <div className="label">Kieu Minh Hieu</div>
          </div>
        </div>

        <div className="cv-list">
          {resumes.length === 0 ? (
            <div className="loading-state">No resumes found</div>
          ) : (
            resumes.map((cv, index) => (
              <button
                className={`cv-item${index === activeIndex ? " active" : ""}`}
                key={cv.file}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <span className="cv-name">{cv.label}</span>
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">{resumes.length} resumes</div>
        <button
          aria-label="Resize sidebar"
          className="sidebar-resizer"
          onPointerDown={startSidebarResize}
          type="button"
        />
      </aside>

      <section className="viewer">
        <div className="viewer-bar">
          <button
            aria-label="Toggle resume list"
            className="toggle-btn"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            type="button"
          >
            <span aria-hidden="true">&#9776;</span>
          </button>
          <span className="viewer-bar-title">{activeResume?.label ?? ""}</span>
          <span className="viewer-bar-tag">{activeResume?.tag ?? ""}</span>
          {activeResume ? (
            <a className="open-btn" href={activeResume.file} rel="noreferrer" target="_blank">
              OPEN
            </a>
          ) : null}
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
