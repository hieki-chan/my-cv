import { useEffect, useMemo, useState } from "react";
import PdfArchive from "./components/PdfArchive";
import PortfolioPage from "./components/PortfolioPage";
import { resumes } from "./data/resumes";

function basePath(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

function currentRoute() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = window.location.pathname;
  const route = base && path.startsWith(base) ? path.slice(base.length) : path;
  return route === "/portfolio" ? "/portfolio" : "/";
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const routes = useMemo(() => ({
    portfolio: basePath("/portfolio"),
    resumes: basePath("/"),
  }), []);

  const navigate = (nextRoute: "/" | "/portfolio") => {
    window.history.pushState(null, "", basePath(nextRoute));
    setRoute(nextRoute);
  };

  if (route === "/portfolio") {
    return (
      <PortfolioPage
        onNavigateToResumes={() => navigate("/")}
        resumeHref={routes.resumes}
      />
    );
  }

  return (
    <PdfArchive
      onNavigateToPortfolio={() => navigate("/portfolio")}
      portfolioHref={routes.portfolio}
      resumes={resumes}
    />
  );
}
