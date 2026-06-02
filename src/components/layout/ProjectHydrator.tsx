"use client";

// Loads local projects once when the app shell mounts. Keeping this in layout
// avoids each screen repeating storage bootstrapping logic.
import { useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";

export function ProjectHydrator() {
  const hasLoadedProjects = useProjectStore((state) => state.hasLoadedProjects);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const projectCount = useProjectStore((state) => state.projects.length);

  useEffect(() => {
    if (!hasLoadedProjects && projectCount === 0) {
      void loadProjects();
    }
  }, [hasLoadedProjects, loadProjects, projectCount]);

  return null;
}
