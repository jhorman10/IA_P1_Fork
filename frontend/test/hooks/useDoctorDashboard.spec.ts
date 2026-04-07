// SPEC-008: useDoctorDashboard hook unit tests
import { act, renderHook, waitFor } from "@testing-library/react";

import { Doctor } from "@/domain/Doctor";
import { useDoctorDashboard } from "@/hooks/useDoctorDashboard";
import { completeAppointment } from "@/services/appointmentService";
import {
  checkInDoctor,
  checkOutDoctor,
  getDoctorById,
} from "@/services/doctorService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/doctorService", () => ({
  getDoctorById: jest.fn(),
  checkInDoctor: jest.fn(),
  checkOutDoctor: jest.fn(),
}));

jest.mock("@/services/appointmentService", () => ({
  completeAppointment: jest.fn(),
}));

import { Profile } from "@/domain/Profile";
import { useAuth } from "@/hooks/useAuth";
import { UseAuthReturn } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetDoctorById = getDoctorById as jest.MockedFunction<
  typeof getDoctorById
>;
const mockCheckInDoctor = checkInDoctor as jest.MockedFunction<
  typeof checkInDoctor
>;
const mockCheckOutDoctor = checkOutDoctor as jest.MockedFunction<
  typeof checkOutDoctor
>;
const mockCompleteAppointment = completeAppointment as jest.MockedFunction<
  typeof completeAppointment
>;

function buildDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: "doc-1",
    name: "Dr. Torres",
    specialty: "General",
    office: "A1",
    status: "offline",
    ...overrides,
  };
}

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  const doctorProfile: Profile = {
    uid: "uid-doc",
    email: "doctor@clinic.local",
    display_name: "Dr. Torres",
    role: "doctor",
    status: "active",
    doctor_id: "doc-1",
  };
  return {
    user: null,
    profile: doctorProfile,
    token: "test-token",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("useDoctorDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("fetches doctor on mount when token and doctor_id are present", async () => {
    mockGetDoctorById.mockResolvedValue(buildDoctor());

    const { result } = renderHook(() => useDoctorDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetDoctorById).toHaveBeenCalledWith("doc-1", "test-token");
    expect(result.current.doctor).toEqual(buildDoctor());
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));

    renderHook(() => useDoctorDashboard());

    expect(mockGetDoctorById).not.toHaveBeenCalled();
  });

  it("exposes error when doctor_id is null", async () => {
    const profileNoId: Profile = {
      uid: "uid-doc",
      email: "doctor@clinic.local",
      display_name: "Dr. Torres",
      role: "doctor",
      status: "active",
      doctor_id: null,
    };
    mockUseAuth.mockReturnValue(buildAuthReturn({ profile: profileNoId }));

    const { result } = renderHook(() => useDoctorDashboard());

    await waitFor(() => expect(result.current.error).toContain("no vinculado"));
    expect(result.current.doctor).toBeNull();
    expect(mockGetDoctorById).not.toHaveBeenCalled();
  });

  it("exposes error when getDoctorById rejects", async () => {
    mockGetDoctorById.mockRejectedValue(new Error("HTTP_ERROR: 404"));

    const { result } = renderHook(() => useDoctorDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("HTTP_ERROR: 404");
    expect(result.current.doctor).toBeNull();
  });

  it("checkIn calls checkInDoctor and updates doctor", async () => {
    const doctorOffline = buildDoctor({ status: "offline" });
    const doctorAvailable = buildDoctor({ status: "available" });
    mockGetDoctorById.mockResolvedValue(doctorOffline);
    mockCheckInDoctor.mockResolvedValue(doctorAvailable);

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkIn("3");
    });

    expect(mockCheckInDoctor).toHaveBeenCalledWith("doc-1", "test-token", "3");
    expect(result.current.doctor?.status).toBe("available");
    expect(result.current.error).toBeNull();
  });

  it("checkIn exposes error when checkInDoctor rejects", async () => {
    mockGetDoctorById.mockResolvedValue(buildDoctor());
    mockCheckInDoctor.mockRejectedValue(new Error("HTTP_ERROR: 409"));

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkIn("2");
    });

    expect(result.current.error).toBe("HTTP_ERROR: 409");
    expect(result.current.successMessage).toBeNull();
  });

  it("checkIn sets successMessage after successful check-in (CRITERIO-1.2)", async () => {
    const doctorAvailable = buildDoctor({ status: "available" });
    mockGetDoctorById.mockResolvedValue(buildDoctor({ status: "offline" }));
    mockCheckInDoctor.mockResolvedValue(doctorAvailable);

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkIn("1");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(
      "Check-in realizado correctamente",
    );
  });

  it("checkOut calls checkOutDoctor and updates doctor", async () => {
    const doctorAvailable = buildDoctor({ status: "available" });
    const doctorOffline = buildDoctor({ status: "offline" });
    mockGetDoctorById.mockResolvedValue(doctorAvailable);
    mockCheckOutDoctor.mockResolvedValue(doctorOffline);

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkOut();
    });

    expect(mockCheckOutDoctor).toHaveBeenCalledWith("doc-1", "test-token");
    expect(result.current.doctor?.status).toBe("offline");
    expect(result.current.error).toBeNull();
  });

  it("checkOut exposes error when busy (backend rejects)", async () => {
    const doctorBusy = buildDoctor({ status: "busy" });
    mockGetDoctorById.mockResolvedValue(doctorBusy);
    mockCheckOutDoctor.mockRejectedValue(
      new Error("Tiene un paciente asignado, no puede salir del consultorio"),
    );

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkOut();
    });

    expect(result.current.error).toBe(
      "Tiene un paciente asignado, no puede salir del consultorio",
    );
    expect(result.current.doctor?.status).toBe("busy");
    expect(result.current.successMessage).toBeNull();
  });

  it("checkOut sets successMessage after successful check-out (CRITERIO-1.3)", async () => {
    const doctorOffline = buildDoctor({ status: "offline" });
    mockGetDoctorById.mockResolvedValue(buildDoctor({ status: "available" }));
    mockCheckOutDoctor.mockResolvedValue(doctorOffline);

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkOut();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(
      "Check-out realizado correctamente",
    );
  });

  it("refetch re-calls getDoctorById", async () => {
    mockGetDoctorById.mockResolvedValue(buildDoctor());

    const { result } = renderHook(() => useDoctorDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetDoctorById).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(mockGetDoctorById).toHaveBeenCalledTimes(2));
  });

  describe("SPEC-012: completeCurrentAppointment", () => {
    it("calls completeAppointment and refreshes doctor status on success", async () => {
      const doctorBusy = buildDoctor({ status: "busy" });
      const doctorAvailable = buildDoctor({ status: "available" });
      mockGetDoctorById
        .mockResolvedValueOnce(doctorBusy)
        .mockResolvedValueOnce(doctorAvailable);
      mockCompleteAppointment.mockResolvedValue({
        status: "accepted",
        message: "Turno marcado como completado",
      });

      const { result } = renderHook(() => useDoctorDashboard());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.completeCurrentAppointment("apt-001");
      });

      expect(mockCompleteAppointment).toHaveBeenCalledWith(
        "apt-001",
        "test-token",
      );
      expect(mockGetDoctorById).toHaveBeenCalledTimes(2);
      expect(result.current.doctor?.status).toBe("available");
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toContain(
        "finalizada correctamente",
      );
    });

    it("exposes backend error and skips refresh when complete fails", async () => {
      mockGetDoctorById.mockResolvedValue(buildDoctor({ status: "busy" }));
      mockCompleteAppointment.mockRejectedValue(
        new Error("Solo turnos en atencion (called) pueden completarse"),
      );

      const { result } = renderHook(() => useDoctorDashboard());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.completeCurrentAppointment("apt-002");
      });

      expect(mockCompleteAppointment).toHaveBeenCalledWith(
        "apt-002",
        "test-token",
      );
      expect(mockGetDoctorById).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBe(
        "Solo turnos en atencion (called) pueden completarse",
      );
      expect(result.current.successMessage).toBeNull();
    });

    it("does nothing when token is null", async () => {
      mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));

      const { result } = renderHook(() => useDoctorDashboard());

      await act(async () => {
        await result.current.completeCurrentAppointment("apt-003");
      });

      expect(mockCompleteAppointment).not.toHaveBeenCalled();
    });
  });
});
