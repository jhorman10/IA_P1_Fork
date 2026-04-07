// SPEC-015: useAvailableOffices hook unit tests
import { renderHook, waitFor } from "@testing-library/react";

import { useAvailableOffices } from "@/hooks/useAvailableOffices";
import { getAvailableOffices } from "@/services/doctorService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/doctorService", () => ({
  getDoctors: jest.fn(),
  getDoctorById: jest.fn(),
  checkInDoctor: jest.fn(),
  checkOutDoctor: jest.fn(),
  getAvailableOffices: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { UseAuthReturn } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetAvailableOffices = getAvailableOffices as jest.MockedFunction<
  typeof getAvailableOffices
>;

const TOKEN = "test-token";

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: null,
    token: TOKEN,
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("useAvailableOffices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("fetches offices on mount when token is present", async () => {
    mockGetAvailableOffices.mockResolvedValue(["1", "3", "5"]);

    const { result } = renderHook(() => useAvailableOffices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetAvailableOffices).toHaveBeenCalledWith(TOKEN);
    expect(result.current.offices).toEqual(["1", "3", "5"]);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));

    renderHook(() => useAvailableOffices());

    expect(mockGetAvailableOffices).not.toHaveBeenCalled();
  });

  it("returns empty offices list when all are occupied", async () => {
    mockGetAvailableOffices.mockResolvedValue([]);

    const { result } = renderHook(() => useAvailableOffices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.offices).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("exposes error when getAvailableOffices rejects", async () => {
    mockGetAvailableOffices.mockRejectedValue(new Error("HTTP_ERROR: 500"));

    const { result } = renderHook(() => useAvailableOffices());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("HTTP_ERROR: 500");
    expect(result.current.offices).toEqual([]);
  });

  it("exposes refetch function that re-queries offices", async () => {
    mockGetAvailableOffices
      .mockResolvedValueOnce(["1", "2"])
      .mockResolvedValueOnce(["3"]);

    const { result } = renderHook(() => useAvailableOffices());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.offices).toEqual(["1", "2"]);

    await waitFor(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetAvailableOffices).toHaveBeenCalledTimes(2);
  });
});
