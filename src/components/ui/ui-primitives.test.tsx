import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Panel } from "./Panel";

describe("design system primitives", () => {
  it("renders a primary action button with stable button semantics", () => {
    render(<Button>Save project</Button>);

    expect(
      screen.getByRole("button", { name: "Save project" })
    ).toHaveAttribute("type", "button");
  });

  it("renders a disabled secondary button", () => {
    render(
      <Button disabled variant="secondary">
        Export PDF
      </Button>
    );

    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  });

  it("renders status badges for operational states", () => {
    render(<Badge tone="success">Ready</Badge>);

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders panel structure with title and description", () => {
    render(
      <Panel description="Saved locally in the current project." title="Storage">
        <p>IndexedDB ready</p>
      </Panel>
    );

    expect(
      screen.getByRole("heading", { name: "Storage" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Saved locally in the current project.")
    ).toBeInTheDocument();
    expect(screen.getByText("IndexedDB ready")).toBeInTheDocument();
  });
});
