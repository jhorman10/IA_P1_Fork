/**
 * SPEC-004 coverage gate:
 * Tests for HTTP service functions (authService, appointmentService,
 * doctorService, profileService) that had 0 % coverage, dragging
 * the global gate below the required 80 %.
 */

// ─── shared fetch mock ───────────────────────────────────────────────────────

function mockFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

// ─── env stub shared across all describe blocks ─────────────────────────────
//     (jest.resetModules is called per describe so each test gets a fresh module)

function setBaseEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

// ─── authService — Firebase functions ────────────────────────────────────────

describe("authService — signInWithFirebase", () => {
  const fakeUser = { uid: "uid-1", email: "doc@clinic.local" };

  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
    jest.mock("firebase/auth", () => ({
      signInWithEmailAndPassword: jest
        .fn()
        .mockResolvedValue({ user: fakeUser }),
      signOut: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock("@/config/firebase", () => ({
      firebaseAuth: { name: "fake-auth" },
    }));
  });

  it("calls signInWithEmailAndPassword and returns user", async () => {
    const { signInWithFirebase } = await import("@/services/authService");
    const { signInWithEmailAndPassword } = await import("firebase/auth");

    const result = await signInWithFirebase("doc@clinic.local", "pass123");

    expect(result).toEqual(fakeUser);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      { name: "fake-auth" },
      "doc@clinic.local",
      "pass123",
    );
  });
});

describe("authService — signOutFromFirebase", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
    jest.mock("firebase/auth", () => ({
      signInWithEmailAndPassword: jest.fn(),
      signOut: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock("@/config/firebase", () => ({
      firebaseAuth: { name: "fake-auth" },
    }));
  });

  it("calls signOut with firebaseAuth", async () => {
    const { signOutFromFirebase } = await import("@/services/authService");
    const { signOut } = await import("firebase/auth");

    await signOutFromFirebase();

    expect(signOut).toHaveBeenCalledWith({ name: "fake-auth" });
  });
});

// ─── authService — resolveSession ────────────────────────────────────────────

describe("authService — resolveSession", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
    jest.mock("@/config/firebase", () => ({
      firebaseAuth: { name: "fake-auth" },
    }));
  });

  it("returns parsed profile on HTTP 200", async () => {
    const profile = {
      uid: "uid-1",
      email: "doctor@clinic.local",
      display_name: "Dr. Test",
      role: "doctor",
      status: "active",
      doctor_id: "doc-id",
    };
    mockFetch(true, profile, 200);

    const { resolveSession } = await import("@/services/authService");
    const result = await resolveSession("valid-token");

    expect(result).toEqual(profile);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/auth/session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token",
        }),
      }),
    );
  });

  it("throws with message from body on non-ok response", async () => {
    mockFetch(false, { message: "Perfil no configurado" }, 403);

    const { resolveSession } = await import("@/services/authService");

    await expect(resolveSession("bad-token")).rejects.toThrow(
      "Perfil no configurado",
    );
  });

  it("throws with HTTP_ERROR code when body has no message", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockRejectedValue(new Error("no json")),
    });

    const { resolveSession } = await import("@/services/authService");

    await expect(resolveSession("expired-token")).rejects.toThrow(
      "HTTP_ERROR: 401",
    );
  });
});

// ─── appointmentService ──────────────────────────────────────────────────────

describe("appointmentService — getQueuePosition", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("returns queue position data on 200", async () => {
    const queueData = { position: 3, appointmentId: "appt-9" };
    mockFetch(true, queueData);

    const { getQueuePosition } = await import("@/services/appointmentService");
    const result = await getQueuePosition(123456);

    expect(result).toEqual(queueData);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/appointments/queue-position/123456",
    );
  });

  it("throws HTTP_ERROR on non-ok response", async () => {
    mockFetch(false, {}, 404);

    const { getQueuePosition } = await import("@/services/appointmentService");

    await expect(getQueuePosition(999)).rejects.toThrow("HTTP_ERROR: 404");
  });
});

// ─── doctorService ───────────────────────────────────────────────────────────

describe("doctorService — getDoctors", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("fetches all doctors when no status filter is given", async () => {
    const doctors = [{ id: "d1", name: "Dr. A", status: "available" }];
    mockFetch(true, doctors);

    const { getDoctors } = await import("@/services/doctorService");
    const result = await getDoctors();

    expect(result).toEqual(doctors);
    expect((fetch as jest.Mock).mock.calls[0][0]).toBe(
      "http://api.test/doctors",
    );
  });

  it("appends status query param when provided", async () => {
    mockFetch(true, []);

    const { getDoctors } = await import("@/services/doctorService");
    await getDoctors("available");

    expect((fetch as jest.Mock).mock.calls[0][0]).toContain("status=available");
  });

  it("throws HTTP_ERROR on non-ok response", async () => {
    mockFetch(false, {}, 500);

    const { getDoctors } = await import("@/services/doctorService");

    await expect(getDoctors()).rejects.toThrow("HTTP_ERROR: 500");
  });
});

// ─── profileService ──────────────────────────────────────────────────────────

describe("profileService — getMyProfile", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("returns profile on success", async () => {
    const profile = {
      uid: "uid-1",
      email: "admin@clinic.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    };
    mockFetch(true, profile);

    const { getMyProfile } = await import("@/services/profileService");
    const result = await getMyProfile("token-123");

    expect(result).toEqual(profile);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/profiles/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch(false, {}, 401);

    const { getMyProfile } = await import("@/services/profileService");

    await expect(getMyProfile("bad-token")).rejects.toThrow("HTTP_ERROR: 401");
  });
});

describe("profileService — getProfiles", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("fetches profiles list without filters", async () => {
    const response = { data: [], pagination: { page: 1, total: 0 } };
    mockFetch(true, response);

    const { getProfiles } = await import("@/services/profileService");
    const result = await getProfiles("token-admin");

    expect(result).toEqual(response);
  });

  it("appends query params when provided", async () => {
    mockFetch(true, { data: [], pagination: {} });

    const { getProfiles } = await import("@/services/profileService");
    await getProfiles("token-admin", {
      role: "doctor",
      status: "active",
      page: 2,
      limit: 10,
    });

    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("role=doctor");
    expect(calledUrl).toContain("status=active");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=10");
  });

  it("throws on non-ok response", async () => {
    mockFetch(false, {}, 403);

    const { getProfiles } = await import("@/services/profileService");

    await expect(getProfiles("bad-token")).rejects.toThrow("HTTP_ERROR: 403");
  });
});

describe("profileService — createProfile", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("returns created profile on 201", async () => {
    const created = {
      uid: "new-uid",
      email: "doc@clinic.local",
      display_name: "Dr. New",
      role: "doctor",
      status: "active",
      doctor_id: "doc-id-1",
    };
    mockFetch(true, created, 201);

    const { createProfile } = await import("@/services/profileService");
    const result = await createProfile(
      {
        uid: "new-uid",
        email: "doc@clinic.local",
        display_name: "Dr. New",
        role: "doctor",
        doctor_id: "doc-id-1",
      },
      "admin-token",
    );

    expect(result).toEqual(created);
  });

  it("throws with body message on 409 conflict", async () => {
    mockFetch(false, { message: "Perfil ya existe" }, 409);

    const { createProfile } = await import("@/services/profileService");

    await expect(
      createProfile(
        {
          uid: "dup-uid",
          email: "x@clinic.local",
          display_name: "X",
          role: "admin",
        },
        "admin-token",
      ),
    ).rejects.toThrow("Perfil ya existe");
  });

  it("throws HTTP_ERROR when body has no message", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockRejectedValue(new Error("no json")),
    });

    const { createProfile } = await import("@/services/profileService");

    await expect(
      createProfile(
        {
          uid: "uid-bad",
          email: "bad@clinic.local",
          display_name: "Bad",
          role: "admin",
        },
        "admin-token",
      ),
    ).rejects.toThrow("HTTP_ERROR: 400");
  });
});

describe("profileService — updateProfile", () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
  });

  it("returns updated profile on 200", async () => {
    const updated = {
      uid: "uid-1",
      email: "x@clinic.local",
      display_name: "X",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    };
    mockFetch(true, updated);

    const { updateProfile } = await import("@/services/profileService");
    const result = await updateProfile(
      "uid-1",
      { role: "recepcionista" },
      "admin-token",
    );

    expect(result).toEqual(updated);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/profiles/uid-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("encodes uid in URL", async () => {
    mockFetch(true, {});

    const { updateProfile } = await import("@/services/profileService");
    await updateProfile(
      "uid with spaces",
      { status: "inactive" },
      "admin-token",
    );

    expect((fetch as jest.Mock).mock.calls[0][0]).toContain(
      encodeURIComponent("uid with spaces"),
    );
  });

  it("throws with body message on error", async () => {
    mockFetch(false, { message: "Perfil no encontrado" }, 404);

    const { updateProfile } = await import("@/services/profileService");

    await expect(
      updateProfile("missing-uid", { status: "inactive" }, "admin-token"),
    ).rejects.toThrow("Perfil no encontrado");
  });

  it("throws HTTP_ERROR when body parsing fails", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error("no json")),
    });

    const { updateProfile } = await import("@/services/profileService");

    await expect(
      updateProfile("uid-1", { status: "inactive" }, "admin-token"),
    ).rejects.toThrow("HTTP_ERROR: 500");
  });
});
