// SPEC-015: ProfileFormModal specialty selector tests (replaces doctor-id selector)
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProfileFormModal from "@/components/ProfileFormModal/ProfileFormModal";
import { Doctor } from "@/domain/Doctor";
import { Profile } from "@/domain/Profile";
import { Specialty } from "@/domain/Specialty";
import {
  useDoctorOptions,
  UseDoctorOptionsReturn,
} from "@/hooks/useDoctorOptions";
import { useSpecialties, UseSpecialtiesReturn } from "@/hooks/useSpecialties";

jest.mock("@/hooks/useDoctorOptions", () => ({
  useDoctorOptions: jest.fn(),
}));

jest.mock("@/hooks/useSpecialties", () => ({
  useSpecialties: jest.fn(),
}));

const mockUseDoctorOptions = useDoctorOptions as jest.MockedFunction<
  typeof useDoctorOptions
>;
const mockUseSpecialties = useSpecialties as jest.MockedFunction<
  typeof useSpecialties
>;

function buildDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: "doc-1",
    name: "Dra. Laura",
    specialty: "Pediatria",
    specialtyId: "sp-1",
    office: null,
    status: "offline",
    ...overrides,
  };
}

function buildSpecialty(overrides: Partial<Specialty> = {}): Specialty {
  return {
    id: "sp-1",
    name: "Pediatría",
    ...overrides,
  };
}

function buildDoctorOptionsReturn(
  overrides: Partial<UseDoctorOptionsReturn> = {},
): UseDoctorOptionsReturn {
  const doctors: Doctor[] = [
    buildDoctor(),
    buildDoctor({
      id: "doc-2",
      name: "Dr. Ruiz",
      specialty: "Cardiologia",
      specialtyId: "sp-2",
    }),
  ];
  return {
    options: doctors.map((d) => ({ value: d.id, label: d.name })),
    doctors,
    loading: false,
    error: null,
    isEmpty: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildSpecialtiesReturn(
  overrides: Partial<UseSpecialtiesReturn> = {},
): UseSpecialtiesReturn {
  return {
    items: [
      buildSpecialty({ id: "sp-1", name: "Pediatría" }),
      buildSpecialty({ id: "sp-2", name: "Cardiología" }),
    ],
    loading: false,
    error: null,
    create: jest.fn(async () => true),
    update: jest.fn(async () => true),
    remove: jest.fn(async () => true),
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    uid: "uid-doc-1",
    email: "doctor@clinic.local",
    display_name: "Dra. Laura",
    role: "doctor",
    status: "active",
    doctor_id: "doc-1",
    ...overrides,
  };
}

interface RenderModalOptions {
  initialData?: Profile | null;
}

function renderModal(options: RenderModalOptions = {}) {
  const onSubmit = jest.fn(async () => true);
  const onClose = jest.fn();

  render(
    <ProfileFormModal
      isOpen
      initialData={options.initialData ?? null}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={false}
      error={null}
    />,
  );

  return { onSubmit, onClose };
}

describe("ProfileFormModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDoctorOptions.mockReturnValue(buildDoctorOptionsReturn());
    mockUseSpecialties.mockReturnValue(buildSpecialtiesReturn());
  });

  it("shows specialty selector for doctor role (no doctor-id field)", async () => {
    const user = userEvent.setup();

    renderModal();

    await user.selectOptions(screen.getByLabelText("Rol"), "doctor");

    expect(screen.getByTestId("specialty-select")).toBeInTheDocument();
    expect(screen.queryByLabelText(/vinculado/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Pediatría" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Cardiología" }),
    ).toBeInTheDocument();
  });

  it("renders empty-specialty state and blocks submit when catalog is empty", async () => {
    const user = userEvent.setup();
    mockUseSpecialties.mockReturnValue(buildSpecialtiesReturn({ items: [] }));

    const { onSubmit } = renderModal();

    await user.selectOptions(screen.getByLabelText("Rol"), "doctor");

    expect(screen.getByTestId("no-specialties-msg")).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: /Crear perfil/i });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit and shows validation when doctor role is selected without specialty", async () => {
    const user = userEvent.setup();

    const { onSubmit } = renderModal();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "doctor@clinic.local",
    );
    await user.type(screen.getByLabelText("Contraseña"), "Secure123");
    await user.type(screen.getByLabelText("Nombre visible"), "Dra. Laura");
    await user.selectOptions(screen.getByLabelText("Rol"), "doctor");

    const submitButton = screen.getByRole("button", { name: /Crear perfil/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Debe seleccionar una especialidad/i,
    );
  });

  it("sends specialty_id in payload when creating a doctor profile", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "dr@clinic.local",
    );
    await user.type(screen.getByLabelText("Contraseña"), "Secure123");
    await user.type(screen.getByLabelText("Nombre visible"), "Dr. Test");
    await user.selectOptions(screen.getByLabelText("Rol"), "doctor");
    await user.selectOptions(screen.getByTestId("specialty-select"), "sp-1");

    await user.click(screen.getByRole("button", { name: /Crear perfil/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ specialty_id: "sp-1", role: "doctor" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ doctor_id: expect.anything() }),
    );
  });

  it("preselects specialty in edit mode when doctor has specialtyId", async () => {
    // doc-1 has specialtyId "sp-1" (Pediatría)
    renderModal({
      initialData: buildProfile({ doctor_id: "doc-1", role: "doctor" }),
    });

    await waitFor(() =>
      expect(screen.getByTestId("specialty-select")).toHaveValue("sp-1"),
    );

    expect(
      (
        screen.getByRole("option", {
          name: "Pediatría",
        }) as HTMLOptionElement
      ).selected,
    ).toBe(true);
  });

  it("does not prefetch specialties when modal is closed", () => {
    render(
      <ProfileFormModal
        isOpen={false}
        initialData={null}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        loading={false}
        error={null}
      />,
    );

    expect(mockUseSpecialties).toHaveBeenCalledWith({ enabled: false });
  });

  it("passes enabled:true to useSpecialties when modal is open", () => {
    renderModal();

    expect(mockUseSpecialties).toHaveBeenCalledWith({ enabled: true });
  });
});
