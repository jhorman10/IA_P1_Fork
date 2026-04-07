// SPEC-015: useSpecialties hook unit tests
import { act, renderHook, waitFor } from "@testing-library/react";

import { Specialty } from "@/domain/Specialty";
import { useSpecialties } from "@/hooks/useSpecialties";
import {
  createSpecialty,
  deleteSpecialty,
  getSpecialties,
  updateSpecialty,
} from "@/services/specialtyService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/specialtyService", () => ({
  getSpecialties: jest.fn(),
  createSpecialty: jest.fn(),
  updateSpecialty: jest.fn(),
  deleteSpecialty: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { UseAuthReturn } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetSpecialties = getSpecialties as jest.MockedFunction<
  typeof getSpecialties
>;
const mockCreateSpecialty = createSpecialty as jest.MockedFunction<
  typeof createSpecialty
>;
const mockUpdateSpecialty = updateSpecialty as jest.MockedFunction<
  typeof updateSpecialty
>;
const mockDeleteSpecialty = deleteSpecialty as jest.MockedFunction<
  typeof deleteSpecialty
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

function buildSpecialty(overrides: Partial<Specialty> = {}): Specialty {
  return { id: "sp-1", name: "Pediatría", ...overrides };
}

describe("useSpecialties", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("fetches specialties on mount when token is present", async () => {
    mockGetSpecialties.mockResolvedValue([buildSpecialty()]);

    const { result } = renderHook(() => useSpecialties());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetSpecialties).toHaveBeenCalledWith(TOKEN);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("sp-1");
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ token: null }));
    mockGetSpecialties.mockResolvedValue([]);

    renderHook(() => useSpecialties());

    expect(mockGetSpecialties).not.toHaveBeenCalled();
  });

  it("does not fetch on mount when enabled is false", () => {
    mockGetSpecialties.mockResolvedValue([buildSpecialty()]);

    renderHook(() => useSpecialties({ enabled: false }));

    expect(mockGetSpecialties).not.toHaveBeenCalled();
  });

  it("fetches when enabled transitions to true", async () => {
    mockGetSpecialties.mockResolvedValue([buildSpecialty()]);

    const { rerender, result } = renderHook(
      ({ enabled }: { enabled: boolean }) => useSpecialties({ enabled }),
      { initialProps: { enabled: false } },
    );

    expect(mockGetSpecialties).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetSpecialties).toHaveBeenCalledWith(TOKEN);
    expect(result.current.items).toHaveLength(1);
  });

  it("exposes error when getSpecialties rejects", async () => {
    mockGetSpecialties.mockRejectedValue(new Error("HTTP_ERROR: 500"));

    const { result } = renderHook(() => useSpecialties());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("HTTP_ERROR: 500");
    expect(result.current.items).toHaveLength(0);
  });

  it("create adds specialty to items on success", async () => {
    mockGetSpecialties.mockResolvedValue([]);
    const newSpecialty = buildSpecialty({ id: "sp-new", name: "Cardiología" });
    mockCreateSpecialty.mockResolvedValue(newSpecialty);

    const { result } = renderHook(() => useSpecialties());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.create("Cardiología");
    });

    expect(mockCreateSpecialty).toHaveBeenCalledWith(
      { name: "Cardiología" },
      TOKEN,
    );
    expect(ok!).toBe(true);
    expect(result.current.items).toEqual([newSpecialty]);
  });

  it("create returns false and exposes error when service rejects", async () => {
    mockGetSpecialties.mockResolvedValue([]);
    mockCreateSpecialty.mockRejectedValue(new Error("HTTP_ERROR: 409"));

    const { result } = renderHook(() => useSpecialties());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.create("Duplicate");
    });

    expect(ok!).toBe(false);
    expect(result.current.error).toBe("HTTP_ERROR: 409");
  });

  it("update replaces the specialty in items on success", async () => {
    const original = buildSpecialty({ id: "sp-1", name: "Medicina Gral" });
    const updated = buildSpecialty({ id: "sp-1", name: "Medicina General" });
    mockGetSpecialties.mockResolvedValue([original]);
    mockUpdateSpecialty.mockResolvedValue(updated);

    const { result } = renderHook(() => useSpecialties());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update("sp-1", "Medicina General");
    });

    expect(mockUpdateSpecialty).toHaveBeenCalledWith(
      "sp-1",
      { name: "Medicina General" },
      TOKEN,
    );
    expect(result.current.items[0].name).toBe("Medicina General");
  });

  it("remove deletes specialty from items on success", async () => {
    mockGetSpecialties.mockResolvedValue([
      buildSpecialty({ id: "sp-1", name: "Odontología" }),
    ]);
    mockDeleteSpecialty.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSpecialties());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("sp-1");
    });

    expect(mockDeleteSpecialty).toHaveBeenCalledWith("sp-1", TOKEN);
    expect(result.current.items).toHaveLength(0);
  });

  it("remove returns false and exposes error when service rejects", async () => {
    mockGetSpecialties.mockResolvedValue([
      buildSpecialty({ id: "sp-1", name: "Pediatría" }),
    ]);
    const err = new Error(
      "No se puede eliminar: hay doctores vinculados",
    ) as Error & { status: number };
    err.status = 400;
    mockDeleteSpecialty.mockRejectedValue(err);

    const { result } = renderHook(() => useSpecialties());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.remove("sp-1");
    });

    expect(ok!).toBe(false);
    expect(result.current.error).toContain("doctores vinculados");
    expect(result.current.items).toHaveLength(1);
  });
});
