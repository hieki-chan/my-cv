/// <reference types="vite/client" />

declare module "virtual:projects-manifest" {
  const projects: Array<{
    path: string;
    title: string;
  }>;

  export default projects;
}
