// SPEC-011: AuditLogTable component tests
import { fireEvent, render, screen } from "@testing-library/react";

import AuditLogTable from "@/components/AuditLogTable/AuditLogTable";
import { AuditLogEntry } from "@/domain/AuditLog";

const entry: AuditLogEntry = {
  id: "log-1",
  action: "PROFILE_CREATED",
  actorUid: "uid-admin",
  targetUid: "uid-target",
  targetId: null,
  details: { role: "recepcionista" },
  timestamp: 1712345678000,
  createdAt: "2026-04-05T14:21:18.000Z",
};

const baseProps = {
  logs: [entry],
  loading: false,
  page: 1,
  totalPages: 2,
  total: 25,
  onPageChange: jest.fn(),
};

describe("AuditLogTable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders table rows when logs are provided", () => {
    render(<AuditLogTable {...baseProps} />);

    expect(screen.getByText("PROFILE_CREATED")).toBeInTheDocument();
    expect(screen.getByText("uid-admin")).toBeInTheDocument();
    expect(screen.getByText("uid-target")).toBeInTheDocument();
  });

  it("shows loading text while loading", () => {
    render(<AuditLogTable {...baseProps} loading={true} logs={[]} />);

    expect(screen.getByTestId("audit-table-loading")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows empty state when no logs and not loading", () => {
    render(<AuditLogTable {...baseProps} logs={[]} total={0} />);

    expect(screen.getByTestId("audit-table-empty")).toBeInTheDocument();
  });

  it("renders pagination when total > 0", () => {
    render(<AuditLogTable {...baseProps} />);

    expect(screen.getByTestId("audit-pagination")).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
  });

  it("previous button is disabled on first page", () => {
    render(<AuditLogTable {...baseProps} page={1} />);

    const prevBtn = screen.getByLabelText("Página anterior");
    expect(prevBtn).toBeDisabled();
  });

  it("next button is disabled on last page", () => {
    render(<AuditLogTable {...baseProps} page={2} totalPages={2} />);

    const nextBtn = screen.getByLabelText("Página siguiente");
    expect(nextBtn).toBeDisabled();
  });

  it("calls onPageChange with previous page on click", () => {
    render(<AuditLogTable {...baseProps} page={2} />);

    fireEvent.click(screen.getByLabelText("Página anterior"));

    expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with next page on click", () => {
    render(<AuditLogTable {...baseProps} />);

    fireEvent.click(screen.getByLabelText("Página siguiente"));

    expect(baseProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("displays dash when targetUid and targetId are null", () => {
    render(
      <AuditLogTable
        {...baseProps}
        logs={[{ ...entry, targetUid: null, targetId: null }]}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
