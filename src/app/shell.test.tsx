import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardScreen,
  PlaceholderScreen,
  routeItems,
  ShellFrame
} from "./shell";

describe("early frontend shell", () => {
  it("renders the dashboard", () => {
    render(<DashboardScreen />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ollama CV Creator")).not.toHaveLength(0);
    expect(screen.getAllByText("Project status")).not.toHaveLength(0);
    expect(screen.getAllByText("TASK-006")).not.toHaveLength(0);
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
