import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginForm from "@/components/LoginForm/LoginForm";

describe("LoginForm", () => {
  it("renders email/password inputs and submit action", () => {
    render(<LoginForm onSubmit={jest.fn()} loading={false} error={null} />);

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Ingresar");
  });

  it("submits sanitized credentials when form is valid", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<LoginForm onSubmit={onSubmit} loading={false} error={null} />);

    await user.type(
      screen.getByTestId("email-input"),
      "  recepcion@clinic.local  ",
    );
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "recepcion@clinic.local",
        "password123",
      );
    });
  });

  it("shows validation error for short password and avoids submit", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<LoginForm onSubmit={onSubmit} loading={false} error={null} />);

    await user.type(
      screen.getByTestId("email-input"),
      "recepcion@clinic.local",
    );
    await user.type(screen.getByTestId("password-input"), "12345");
    await user.click(screen.getByTestId("submit-button"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La contraseña debe tener al menos 6 caracteres.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders external error message from parent props", () => {
    render(
      <LoginForm
        onSubmit={jest.fn()}
        loading={false}
        error="Credenciales incorrectas"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Credenciales incorrectas",
    );
  });
});
