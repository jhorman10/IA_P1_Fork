import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

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
  overrides: Partial<ComponentProps<typeof OfficeManager>> = {},
) {
  const props: ComponentProps<typeof OfficeManager> = {
    items: [buildOffice()],
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
  it("allows disabling a free office", async () => {
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
      ],
      onToggleEnabled,
    });

    await user.click(screen.getByTestId("btn-toggle-office-1"));

    expect(onToggleEnabled).toHaveBeenCalledWith("1", false);
  });

  it("blocks disabling an occupied office", () => {
    const onToggleEnabled = jest.fn().mockResolvedValue(true);

    renderOfficeManager({
      items: [
        buildOffice({
          number: "2",
          enabled: true,
          occupied: true,
          occupied_by_doctor_id: "doc-2",
          occupied_by_doctor_name: "Dra. Ana Perez",
          occupied_by_status: "available",
          can_disable: false,
        }),
      ],
      onToggleEnabled,
    });

    const occupiedToggle = screen.getByTestId("btn-toggle-office-2");
    expect(occupiedToggle).toBeDisabled();
    expect(occupiedToggle).toHaveAttribute(
      "title",
      expect.stringContaining("No se puede deshabilitar"),
    );
    expect(screen.getByText(/Podr.s deshabilitarlo/)).toBeInTheDocument();
    expect(onToggleEnabled).not.toHaveBeenCalled();
  });
});
