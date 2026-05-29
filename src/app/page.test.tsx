import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("@/lib/api/ai-client", () => ({
  getAiStatus: vi.fn(() => new Promise(() => undefined))
}));

describe("Home", () => {
  it("renders the dashboard shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Dashboard"
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ollama CV Creator")).not.toHaveLength(0);
  });
});
