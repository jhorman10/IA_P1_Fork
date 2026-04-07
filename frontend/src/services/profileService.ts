// SPEC-004: Profile service — CRUD calls to backend profiles API
import { env } from "@/config/env";
import {
  CreateProfileDTO,
  Profile,
  ProfilesResponse,
  UpdateProfileDTO,
} from "@/domain/Profile";

function authHeaders(idToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

export async function getMyProfile(idToken: string): Promise<Profile> {
  const res = await fetch(`${env.API_BASE_URL}/profiles/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}

export async function getProfiles(
  idToken: string,
  params?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<ProfilesResponse> {
  const url = new URL(`${env.API_BASE_URL}/profiles`);
  if (params?.role) url.searchParams.set("role", params.role);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}

export async function createProfile(
  data: CreateProfileDTO,
  idToken: string,
): Promise<Profile> {
  const res = await fetch(`${env.API_BASE_URL}/profiles`, {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateProfile(
  uid: string,
  data: UpdateProfileDTO,
  idToken: string,
): Promise<Profile> {
  const res = await fetch(
    `${env.API_BASE_URL}/profiles/${encodeURIComponent(uid)}`,
    {
      method: "PATCH",
      headers: authHeaders(idToken),
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
