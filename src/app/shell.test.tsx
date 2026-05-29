import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardScreen,
  PlaceholderScreen,
  routeItems,
  ShellFrame
} from "./shell";

vi.mock("@/lib/api/ai-client", () => ({
  getAiStatus: vi.fn(() => new Promise(() => undefined))
}));

describe("early frontend shell", () => {
  it("renders the dashboard", () => {
    render(<DashboardScreen />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ollama CV Creator")).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Schnellstart" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Letzte Aktivitäten" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KI Status" })).toBeInTheDocument();
    expect(screen.getAllByText("Erfahrung sammeln")).not.toHaveLength(0);
    expect(
      screen.getByRole("link", {
        name: "Erfahrung sammeln Notizen, Text oder Dateien importieren"
      })
    ).toHaveAttribute("href", "/import");
  });

  it("renders navigation links for all MVP routes", () => {
    render(
      <ShellFrame title="Dashboard">
        <p>Dashboard content</p>
      </ShellFrame>
    );

    for (const routeItem of routeItems) {
      expect(
        screen.getByRole("link", { name: routeItem.label })
      ).toHaveAttribute("href", routeItem.href);
    }
  });

  it("renders placeholder pages", () => {
    render(<PlaceholderScreen title="Import" status="Not started" />);

    expect(screen.getByRole("heading", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.getByText("No backend activity")).toBeInTheDocument();
  });
});
