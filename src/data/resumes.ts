import resumesManifest from "virtual:resumes-manifest";

export type Resume = {
  file: string;
  label: string;
  tag: string;
};

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const resumes: Resume[] = resumesManifest.map((resume) => ({
  ...resume,
  file: publicAsset(resume.file),
}));
