import { act, renderHook, waitFor } from "@testing-library/react";

import { Office } from "@/domain/Office";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import { useOfficeCatalog } from "@/hooks/useOfficeCatalog";
import {
  applyOfficeCapacity,
  getOffices,
  updateOfficeEnabled,
} from "@/services/officeService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/officeService", () => ({
  getOffices: jest.fn(),
  applyOfficeCapacity: jest.fn(),
  updateOfficeEnabled: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetOffices = getOffices as jest.MockedFunction<typeof getOffices>;
const mockApplyOfficeCapacity = applyOfficeCapacity as jest.MockedFunction<
  typeof applyOfficeCapacity
>;
const mockUpdateOfficeEnabled = updateOfficeEnabled as jest.MockedFunction<
  typeof updateOfficeEnabled
>;

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: null,
    token: "token-admin",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

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

describe("useOfficeCatalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("fetches offices on mount when token is present", async () => {
    mockGetOffices.mockResolvedValue([buildOffice({ number: "1" })]);

    const { result } = renderHook(() => useOfficeCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetOffices).toHaveBeenCalledWith("token-admin");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].number).toBe("1");
    expect(result.current.error).toBeNull();
  });

  it("does not fetch and returns false actions when token is null", async () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));

    const { result } = renderHook(() => useOfficeCatalog());

    expect(mockGetOffices).not.toHaveBeenCalled();

    let applyResult = true;
    let toggleResult = true;

    await act(async () => {
      applyResult = await result.current.applyCapacity(8);
      toggleResult = await result.current.toggleEnabled("1", false);
    });

    expect(applyResult).toBe(false);
    expect(toggleResult).toBe(false);
    expect(mockApplyOfficeCapacity).not.toHaveBeenCalled();
    expect(mockUpdateOfficeEnabled).not.toHaveBeenCalled();
  });

  it("applyCapacity updates catalog by refetching offices", async () => {
    mockGetOffices
      .mockResolvedValueOnce([
        buildOffice({ number: "1" }),
        buildOffice({ number: "2" }),
        buildOffice({ number: "3" }),
      ])
      .mockResolvedValueOnce([
        buildOffice({ number: "1" }),
        buildOffice({ number: "2" }),
        buildOffice({ number: "3" }),
        buildOffice({ number: "4" }),
      ]);

    mockApplyOfficeCapacity.mockResolvedValue({
      target_total: 4,
      created_offices: ["4"],
      unchanged: false,
    });

    const { result } = renderHook(() => useOfficeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.applyCapacity(4);
    });

    expect(ok).toBe(true);
    expect(mockApplyOfficeCapacity).toHaveBeenCalledWith(
      { target_total: 4 },
      "token-admin",
    );
    expect(mockGetOffices).toHaveBeenCalledTimes(2);
    expect(result.current.items.map((o) => o.number)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("applyCapacity exposes backend error when operation fails", async () => {
    mockGetOffices.mockResolvedValue([buildOffice({ number: "1" })]);
    mockApplyOfficeCapacity.mockRejectedValue(
      new Error(
        "La reduccion de capacidad se realiza deshabilitando consultorios",
      ),
    );

    const { result } = renderHook(() => useOfficeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.applyCapacity(0);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toContain(
      "La reduccion de capacidad se realiza deshabilitando consultorios",
    );
  });

  it("toggleEnabled updates only the requested office", async () => {
    mockGetOffices.mockResolvedValue([
      buildOffice({ number: "1", enabled: true }),
      buildOffice({ number: "2", enabled: true }),
    ]);

    mockUpdateOfficeEnabled.mockResolvedValue(
      buildOffice({
        number: "2",
        enabled: false,
        occupied: false,
        can_disable: false,
      }),
    );

    const { result } = renderHook(() => useOfficeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.toggleEnabled("2", false);
    });

    expect(ok).toBe(true);
    expect(mockUpdateOfficeEnabled).toHaveBeenCalledWith(
      "2",
      { enabled: false },
      "token-admin",
    );

    const officeOne = result.current.items.find((o) => o.number === "1");
    const officeTwo = result.current.items.find((o) => o.number === "2");

    expect(officeOne?.enabled).toBe(true);
    expect(officeTwo?.enabled).toBe(false);
  });
});
