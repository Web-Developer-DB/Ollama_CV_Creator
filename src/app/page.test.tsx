import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the dashboard shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Overview"
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ollama CV Creator")).not.toHaveLength(0);
  });
});
