// SPEC-014: useDoctorOptions hook unit tests
import { renderHook, waitFor } from "@testing-library/react";

import { Doctor } from "@/domain/Doctor";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { getDoctors } from "@/services/doctorService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/doctorService", () => ({
  getDoctors: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetDoctors = getDoctors as jest.MockedFunction<typeof getDoctors>;

function buildDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: "doc-1",
    name: "Dra. Laura",
    specialty: "Pediatria",
    office: "2",
    status: "offline",
    ...overrides,
  };
}

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: null,
    token: "id-token-test",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("useDoctorOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("loads doctors with auth token and maps readable labels", async () => {
    mockGetDoctors.mockResolvedValue([
      buildDoctor({ id: "doc-1", office: "2" }),
      buildDoctor({
        id: "doc-2",
        name: "Dr. Ruiz",
        specialty: "Cardiologia",
        office: "",
      }),
    ]);

    const { result } = renderHook(() => useDoctorOptions());

    await waitFor(() =>
      expect(mockGetDoctors).toHaveBeenCalledWith(undefined, "id-token-test"),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.options).toEqual([
      {
        value: "doc-1",
        label: "Dra. Laura · Pediatria · Consultorio 2",
      },
      {
        value: "doc-2",
        label: "Dr. Ruiz · Cardiologia",
      },
    ]);
    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(false);
  });

  it("exposes empty state when doctors endpoint returns an empty list", async () => {
    mockGetDoctors.mockResolvedValue([]);

    const { result } = renderHook(() => useDoctorOptions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.options).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(true);
  });

  it("does not fetch doctors when auth token is missing", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));

    renderHook(() => useDoctorOptions());

    expect(mockGetDoctors).not.toHaveBeenCalled();
  });
});
