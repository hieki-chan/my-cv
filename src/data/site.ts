const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const site = {
  name: "Kieu Minh Hieu",
  title: "Kieu Minh Hieu - Unity Developer",
  description: "Personal website and portfolio for Unity developer Kieu Minh Hieu.",
  portfolioMarkdown: publicAsset("portfolio.md"),
  projectsManifest: publicAsset("projects/index.json"),
  rssFeed: publicAsset("rss.xml"),
};
