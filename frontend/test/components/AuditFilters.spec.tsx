// SPEC-011: AuditFilters component tests
import { fireEvent, render, screen } from "@testing-library/react";

import AuditFilters from "@/components/AuditFilters/AuditFilters";
import { AuditLogFilters } from "@/domain/AuditLog";

const emptyFilters: AuditLogFilters = {};

describe("AuditFilters", () => {
  it("renders all filter controls", () => {
    render(<AuditFilters filters={emptyFilters} onFilterChange={jest.fn()} />);

    expect(screen.getByLabelText("Acción")).toBeInTheDocument();
    expect(screen.getByLabelText("Actor")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
  });

  it("calls onFilterChange with action when action dropdown changes", () => {
    const onFilterChange = jest.fn();
    render(
      <AuditFilters filters={emptyFilters} onFilterChange={onFilterChange} />,
    );

    fireEvent.change(screen.getByLabelText("Acción"), {
      target: { value: "PROFILE_CREATED" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ action: "PROFILE_CREATED" });
  });

  it("calls onFilterChange with undefined action when cleared", () => {
    const onFilterChange = jest.fn();
    render(
      <AuditFilters
        filters={{ action: "PROFILE_CREATED" }}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Acción"), {
      target: { value: "" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ action: undefined });
  });

  it("calls onFilterChange with actorSearch when input changes", () => {
    const onFilterChange = jest.fn();
    render(
      <AuditFilters filters={emptyFilters} onFilterChange={onFilterChange} />,
    );

    fireEvent.change(screen.getByLabelText("Actor"), {
      target: { value: "admin@clinica.com" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      actorSearch: "admin@clinica.com",
    });
  });

  it("calls onFilterChange with undefined actorSearch when cleared", () => {
    const onFilterChange = jest.fn();
    render(
      <AuditFilters
        filters={{ actorSearch: "admin@clinica.com" }}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Actor"), {
      target: { value: "" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ actorSearch: undefined });
  });

  it("reflects existing filter values in controls", () => {
    render(
      <AuditFilters
        filters={{
          action: "DOCTOR_CHECK_IN",
          actorSearch: "admin@clinica.com",
        }}
        onFilterChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText<HTMLSelectElement>("Acción").value).toBe(
      "DOCTOR_CHECK_IN",
    );
    expect(screen.getByLabelText<HTMLInputElement>("Actor").value).toBe(
      "admin@clinica.com",
    );
  });

  it("renders all audit action options in the dropdown", () => {
    render(<AuditFilters filters={emptyFilters} onFilterChange={jest.fn()} />);

    const select = screen.getByLabelText<HTMLSelectElement>("Acción");
    const options = Array.from(select.options).map((o) => o.value);

    expect(options).toContain("PROFILE_CREATED");
    expect(options).toContain("PROFILE_UPDATED");
    expect(options).toContain("DOCTOR_CHECK_IN");
    expect(options).toContain("DOCTOR_CHECK_OUT");
    expect(options).toContain("APPOINTMENT_CREATED");
    expect(options).toContain("SESSION_RESOLVED");
  });
});
