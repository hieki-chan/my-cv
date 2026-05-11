export type Resume = {
  file: string;
  label: string;
  tag: string;
};

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const resumes: Resume[] = [
  {
    file: publicAsset("resumes/resume-intern.pdf"),
    label: "Intern",
    tag: "Entry Level",
  },
  {
    file: publicAsset("resumes/resume-fresher.pdf"),
    label: "Fresher",
    tag: "Fresher",
  },
];
