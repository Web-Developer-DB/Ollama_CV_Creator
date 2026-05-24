import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import { JobScreen } from "./JobScreen";

describe("JobScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined
    });
  });

  it("saves the job title", async () => {
    const user = userEvent.setup();

    render(<JobScreen />);

    await user.type(screen.getByLabelText("Job title"), "Frontend Engineer");
    await user.type(
      screen.getByLabelText("Job description"),
      "Build accessible React applications."
    );
    await user.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.jobTarget).toMatchObject({
        title: "Frontend Engineer"
      });
    });
  });

  it("saves the company", async () => {
    const user = userEvent.setup();

    render(<JobScreen />);

    await user.type(screen.getByLabelText("Company"), "Acme GmbH");
    await user.type(
      screen.getByLabelText("Job description"),
      "Build accessible React applications."
    );
    await user.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.jobTarget).toMatchObject({
        company: "Acme GmbH"
      });
    });
  });

  it("saves the job description", async () => {
    const user = userEvent.setup();

    render(<JobScreen />);

    await user.type(
      screen.getByLabelText("Job description"),
      "Own UI architecture and collaborate with product teams."
    );
    await user.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.jobTarget).toMatchObject({
        jobDescription:
          "Own UI architecture and collaborate with product teams."
      });
    });
  });

  it("saves the selected tone", async () => {
    const user = userEvent.setup();

    render(<JobScreen />);

    await user.type(
      screen.getByLabelText("Job description"),
      "Build accessible React applications."
    );
    await user.selectOptions(screen.getByLabelText("Tone"), "confident");
    await user.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.jobTarget).toMatchObject({
        tone: "confident"
      });
    });
  });
});
