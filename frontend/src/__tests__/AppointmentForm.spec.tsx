import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock the hook used by the component
jest.mock("@/hooks/useAppointmentRegistration", () => ({
  useAppointmentRegistration: jest.fn(),
}));

import AppointmentForm from "@/components/AppointmentForm/AppointmentForm";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";

describe("AppointmentForm component", () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    (useAppointmentRegistration as unknown as jest.Mock).mockReturnValue({
      register: mockRegister,
      loading: false,
      success: null,
      error: null,
      isSubmitting: false,
    });
  });

  it("renders inputs and submits sanitized values", async () => {
    const user = userEvent.setup();

    render(<AppointmentForm />);

    await user.type(screen.getByTestId("fullName-input"), "  John <script>  ");
    await user.type(screen.getByTestId("idCard-input"), "  12345678  ");
    await user.selectOptions(screen.getByTestId("priority-select"), "high");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "John",
          idCard: "12345678",
          priority: "high",
        }),
      );
    });
  });
});
