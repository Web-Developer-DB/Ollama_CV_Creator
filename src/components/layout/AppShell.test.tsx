import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";
import { Header } from "./Header";
import { routeItems, Sidebar } from "./Sidebar";

describe("layout components", () => {
  it("renders the app shell with header, sidebar, and content", () => {
    render(
      <AppShell title="Dashboard">
        <p>Dashboard content</p>
      </AppShell>
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("renders header status metrics", () => {
    render(
      <Header
        metrics={[
          { label: "Project status", value: "No project loaded" },
          { label: "Current task", value: "TASK-006" }
        ]}
        title="Import"
      />
    );

    expect(screen.getByText("Ollama CV Creator")).toBeInTheDocument();
    expect(screen.getByText("Project status")).toBeInTheDocument();
    expect(screen.getByText("TASK-006")).toBeInTheDocument();
  });

  it("renders sidebar links for every route", () => {
    render(<Sidebar />);

    for (const routeItem of routeItems) {
      expect(
        screen.getByRole("link", { name: routeItem.label })
      ).toHaveAttribute("href", routeItem.href);
    }
  });
});
