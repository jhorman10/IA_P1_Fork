import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OfficeManager from "@/components/OfficeManager/OfficeManager";
import { Office } from "@/domain/Office";

function buildOffice(overrides: Partial<Office> = {}): Office {
  return {
    number: "1",
    enabled: true,
    occupied: false,
    occupied_by_doctor_id: null,
    occupied_by_doctor_name: null,
    occupied_by_status: null,
    can_disable: true,
    ...overrides,
  };
}

function renderOfficeManager(
  overrides: Partial<React.ComponentProps<typeof OfficeManager>> = {},
) {
  const props: React.ComponentProps<typeof OfficeManager> = {
    items: [
      buildOffice({
        number: "1",
        enabled: true,
        occupied: false,
        can_disable: true,
      }),
      buildOffice({
        number: "2",
        enabled: true,
        occupied: true,
        occupied_by_doctor_id: "doc-2",
        occupied_by_doctor_name: "Dra. Ana Perez",
        occupied_by_status: "available",
        can_disable: false,
      }),
      buildOffice({
        number: "3",
        enabled: false,
        occupied: false,
        can_disable: false,
      }),
    ],
    loading: false,
    error: null,
    onApplyCapacity: jest.fn().mockResolvedValue(true),
    onToggleEnabled: jest.fn().mockResolvedValue(true),
    ...overrides,
  };

  render(<OfficeManager {...props} />);
  return props;
}

describe("OfficeManager", () => {
  it("renders catalog rows and summary counts", () => {
    renderOfficeManager();

    expect(screen.getByTestId("office-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("office-item-2")).toBeInTheDocument();
    expect(screen.getByTestId("office-item-3")).toBeInTheDocument();

    expect(screen.getByTestId("office-enabled-badge-1")).toHaveTextContent(
      "Habilitado",
    );
    expect(screen.getByTestId("office-enabled-badge-3")).toHaveTextContent(
      "Deshabilitado",
    );
    expect(screen.getByText(/Ocupado .*Dra\. Ana Perez/)).toBeInTheDocument();

    const summary = screen.getByTestId("office-summary");
    expect(summary).toHaveTextContent("Total: 3");
    expect(summary).toHaveTextContent("Habilitados: 2");
    expect(summary).toHaveTextContent("Deshabilitados: 1");
    expect(summary).toHaveTextContent("Ocupados: 1");
    expect(summary).toHaveTextContent("Libres (habilitados): 1");
  });

  it("disables toggle button when office is occupied", () => {
    renderOfficeManager();

    const occupiedToggle = screen.getByTestId("btn-toggle-office-2");
    expect(occupiedToggle).toBeDisabled();
    expect(occupiedToggle).toHaveAttribute(
      "title",
      expect.stringContaining("No se puede deshabilitar"),
    );
    expect(screen.getByText(/Podr.s deshabilitarlo/)).toBeInTheDocument();
  });

  it("applies target capacity and clears input when apply succeeds", async () => {
    const user = userEvent.setup();
    const onApplyCapacity = jest.fn().mockResolvedValue(true);

    renderOfficeManager({
      items: [
        buildOffice({ number: "1" }),
        buildOffice({ number: "2" }),
        buildOffice({ number: "3" }),
        buildOffice({ number: "4" }),
        buildOffice({ number: "5" }),
      ],
      onApplyCapacity,
    });

    const input = screen.getByTestId(
      "office-capacity-input",
    ) as HTMLInputElement;
    await user.type(input, "8");
    await user.click(screen.getByTestId("btn-apply-capacity"));

    expect(onApplyCapacity).toHaveBeenCalledWith(8);
    expect(input.value).toBe("");
  });

  it("shows validation message when target is below current max", async () => {
    const user = userEvent.setup();
    const onApplyCapacity = jest.fn().mockResolvedValue(true);

    renderOfficeManager({
      items: [buildOffice({ number: "1" }), buildOffice({ number: "5" })],
      onApplyCapacity,
    });

    await user.type(screen.getByTestId("office-capacity-input"), "4");
    await user.click(screen.getByTestId("btn-apply-capacity"));

    expect(onApplyCapacity).not.toHaveBeenCalled();
    expect(screen.getByTestId("office-error")).toHaveTextContent(
      /La reducci.n de capacidad se realiza deshabilitando consultorios/i,
    );
  });

  it("toggles enabled state for free and disabled offices", async () => {
    const user = userEvent.setup();
    const onToggleEnabled = jest.fn().mockResolvedValue(true);

    renderOfficeManager({
      items: [
        buildOffice({
          number: "1",
          enabled: true,
          occupied: false,
          can_disable: true,
        }),
        buildOffice({
          number: "3",
          enabled: false,
          occupied: false,
          can_disable: false,
        }),
      ],
      onToggleEnabled,
    });

    await user.click(screen.getByTestId("btn-toggle-office-1"));
    await user.click(screen.getByTestId("btn-toggle-office-3"));

    expect(onToggleEnabled).toHaveBeenNthCalledWith(1, "1", false);
    expect(onToggleEnabled).toHaveBeenNthCalledWith(2, "3", true);
  });
});
