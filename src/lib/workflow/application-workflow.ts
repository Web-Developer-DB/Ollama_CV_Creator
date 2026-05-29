export type WorkflowRoute = {
  href: string;
  label: string;
  step?: string;
  title: string;
  dependency: string;
  outcome: string;
};

export type NavigationGroup = {
  label: string;
  items: WorkflowRoute[];
};

export const overviewRoute: WorkflowRoute = {
  href: "/dashboard",
  label: "Dashboard",
  title: "Bewerbungsunterlagen erstellen",
  dependency: "Projektarbeitsbereich",
  outcome: "Geführte Aktion"
};

export const cvWorkflowSteps: WorkflowRoute[] = [
  {
    href: "/import",
    label: "Kandidat",
    step: "1",
    title: "Erfahrung sammeln",
    dependency: "Start hier",
    outcome: "Rohdaten gespeichert"
  },
  {
    href: "/profile",
    label: "Profile",
    step: "2",
    title: "Profil überprüfen",
    dependency: "Erfordert Kandidatentext",
    outcome: "Verifizierte Profildaten"
  },
  {
    href: "/documents",
    label: "Schreiben",
    step: "3",
    title: "CV und Anschreiben schreiben",
    dependency: "Erfordert geprüftes Profil",
    outcome: "Editierbare Dokumente"
  },
  {
    href: "/templates",
    label: "Design",
    step: "4",
    title: "Dokumentdesign wählen",
    dependency: "Erfordert Dokumententwürfe",
    outcome: "Professionelle Vorschau"
  },
  {
    href: "/export",
    label: "Export",
    step: "5",
    title: "Bewerbungspaket exportieren",
    dependency: "Erfordert gewähltes Design",
    outcome: "PDF und Projektdateien"
  }
];

export const tailoringSteps: WorkflowRoute[] = [
  {
    href: "/job",
    label: "Zielrolle",
    step: "T1",
    title: "Zielrolle hinzufügen",
    dependency: "Optional nach Profil",
    outcome: "Anpassungskontext"
  },
  {
    href: "/analysis",
    label: "Anpassung",
    step: "T2",
    title: "Positionierung finden",
    dependency: "Erfordert Zielrolle",
    outcome: "Relevante Betonung"
  }
];

export const jobMatchingSteps = tailoringSteps;

export const workflowSteps = cvWorkflowSteps;

export const systemRoutes: WorkflowRoute[] = [
  {
    href: "/ai",
    label: "AI Status",
    title: "AI Status",
    dependency: "Ollama service",
    outcome: "Model readiness visible"
  }
];

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Übersicht",
    items: [overviewRoute]
  },
  {
    label: "Dokumenterstellung",
    items: cvWorkflowSteps.slice(0, 3)
  },
  {
    label: "Design & Export",
    items: cvWorkflowSteps.slice(3)
  },
  {
    label: "Rolle anpassen",
    items: tailoringSteps
  },
  {
    label: "System",
    items: systemRoutes
  }
];

export const routeItems: WorkflowRoute[] = navigationGroups.flatMap(
  (group) => group.items
);
