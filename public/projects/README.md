# Project Content Guide

Each portfolio project lives in its own folder:

```txt
public/projects/
  index.json
  project-slug/
    project.md
    assets/
      cover.png
      screenshot-01.png
      demo.mp4
```

Add projects to `index.json` in the order you want them to appear.

```json
{
  "slug": "project-slug",
  "title": "Project Name",
  "summary": "Short summary shown before the markdown body.",
  "year": "2026",
  "stack": ["Unity", "C#", "React"],
  "cover": "projects/project-slug/assets/cover.png",
  "markdown": "projects/project-slug/project.md"
}
```

Inside `project.md`, reference local assets relative to that project folder:

```md
![Screenshot](assets/screenshot-01.png)
![Gameplay demo](assets/demo.mp4)
```
