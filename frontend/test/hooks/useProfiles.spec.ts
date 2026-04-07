// SPEC-004: useProfiles — admin profile management hook unit tests
import { act, renderHook, waitFor } from "@testing-library/react";

import { CreateProfileDTO, Profile, UpdateProfileDTO } from "@/domain/Profile";
import { useProfiles } from "@/hooks/useProfiles";
import {
  createProfile,
  getProfiles,
  updateProfile,
} from "@/services/profileService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/profileService", () => ({
  getProfiles: jest.fn(),
  createProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetProfiles = getProfiles as jest.MockedFunction<typeof getProfiles>;
const mockCreateProfile = createProfile as jest.MockedFunction<
  typeof createProfile
>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<
  typeof updateProfile
>;

const sampleProfile: Profile = {
  uid: "uid-1",
  email: "recep@clinic.local",
  display_name: "Recepción",
  role: "recepcionista",
  status: "active",
  doctor_id: null,
};

function buildProfilesResponse(items: Profile[] = [sampleProfile]) {
  return {
    data: items,
    pagination: { page: 1, limit: 20, total: items.length, total_pages: 1 },
  };
}

describe("useProfiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      token: "id-token-test",
      loading: false,
      authError: null,
      login: jest.fn(),
      logout: jest.fn(),
    });
  });

  it("fetches profiles on mount when token is present", async () => {
    mockGetProfiles.mockResolvedValue(buildProfilesResponse());

    const { result } = renderHook(() => useProfiles());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetProfiles).toHaveBeenCalledWith("id-token-test");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].uid).toBe("uid-1");
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      token: null,
      loading: false,
      authError: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderHook(() => useProfiles());

    expect(mockGetProfiles).not.toHaveBeenCalled();
  });

  it("sets error when getProfiles fails", async () => {
    mockGetProfiles.mockRejectedValue(new Error("HTTP_ERROR: 403"));

    const { result } = renderHook(() => useProfiles());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBe("HTTP_ERROR: 403");
  });

  it("create() calls createProfile and refetches list", async () => {
    mockGetProfiles.mockResolvedValue(buildProfilesResponse());
    mockCreateProfile.mockResolvedValue(sampleProfile);

    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const dto: CreateProfileDTO = {
      uid: "uid-2",
      email: "admin@clinic.local",
      display_name: "Admin",
      role: "admin",
    };

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.create(dto);
    });

    expect(success).toBe(true);
    expect(mockCreateProfile).toHaveBeenCalledWith(dto, "id-token-test");
    expect(mockGetProfiles).toHaveBeenCalledTimes(2); // initial + after create
  });

  it("create() returns false and sets error when createProfile fails", async () => {
    mockGetProfiles.mockResolvedValue(buildProfilesResponse([]));
    mockCreateProfile.mockRejectedValue(new Error("HTTP_ERROR: 409"));

    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.create({
        uid: "uid-dup",
        email: "dup@clinic.local",
        display_name: "Dup",
        role: "recepcionista",
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("HTTP_ERROR: 409");
  });

  it("update() calls updateProfile and refetches list", async () => {
    mockGetProfiles.mockResolvedValue(buildProfilesResponse());
    mockUpdateProfile.mockResolvedValue({
      ...sampleProfile,
      status: "inactive",
    });

    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const dto: UpdateProfileDTO = { status: "inactive" };

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.update("uid-1", dto);
    });

    expect(success).toBe(true);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "uid-1",
      dto,
      "id-token-test",
    );
    expect(mockGetProfiles).toHaveBeenCalledTimes(2); // initial + after update
  });
});
