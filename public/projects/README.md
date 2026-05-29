# Project Content Guide

Each portfolio project lives in its own folder:

```txt
public/projects/
  1-project-slug/
    project.md
```

The site scans folders automatically during dev/build and loads every folder that contains `project.md`. No `index.json` is needed.

Use a number prefix to control order, for example `1-zombie-on-the-beach`, `2-t-rex-runner`. Folders without a number come after numbered folders and are sorted by name.

The project title is generated from the folder name after removing the number prefix:

```txt
project-n -> Project N
1-zombie-on-the-beach -> Zombie On The Beach
```

Inside `project.md`, use normal markdown content. The first paragraph becomes the project summary on the portfolio page.
