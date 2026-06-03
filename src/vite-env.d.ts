/// <reference types="vite/client" />

declare module "virtual:projects-manifest" {
  const projects: Array<{
    path: string;
    title: string;
  }>;

  export default projects;
}

declare module "virtual:resumes-manifest" {
  const resumes: Array<{
    file: string;
    label: string;
    tag: string;
  }>;

  export default resumes;
}
