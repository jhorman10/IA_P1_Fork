// SPEC-006: AuthHydrationBoundary — prevents flash of unauthenticated content

import { render, screen } from "@testing-library/react";

import AuthHydrationBoundary from "@/components/AuthHydrationBoundary/AuthHydrationBoundary";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: null,
    token: null,
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("AuthHydrationBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("shows the default spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: true }));

    render(
      <AuthHydrationBoundary>
        <p>Protected content</p>
      </AuthHydrationBoundary>,
    );

    expect(screen.getByTestId("auth-hydration-loading")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children once auth state has resolved", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: false }));

    render(
      <AuthHydrationBoundary>
        <p>Protected content</p>
      </AuthHydrationBoundary>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(
      screen.queryByTestId("auth-hydration-loading"),
    ).not.toBeInTheDocument();
  });

  it("shows the custom fallback instead of spinner when provided", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: true }));

    render(
      <AuthHydrationBoundary fallback={<p>Custom loading state</p>}>
        <p>Protected content</p>
      </AuthHydrationBoundary>,
    );

    expect(screen.getByText("Custom loading state")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("auth-hydration-loading"),
    ).not.toBeInTheDocument();
  });

  it("transitions from loading to children without flash (no-flash contract)", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: true }));

    const { rerender } = render(
      <AuthHydrationBoundary>
        <p>Protected content</p>
      </AuthHydrationBoundary>,
    );

    // While loading: children must NOT be in the DOM
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();

    // Auth resolves — simulate state change
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: false }));

    rerender(
      <AuthHydrationBoundary>
        <p>Protected content</p>
      </AuthHydrationBoundary>,
    );

    // After loading: children are rendered, no spinner
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(
      screen.queryByTestId("auth-hydration-loading"),
    ).not.toBeInTheDocument();
  });

  it("renders multiple children correctly after auth resolves", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ loading: false }));

    render(
      <AuthHydrationBoundary>
        <p>Child one</p>
        <p>Child two</p>
      </AuthHydrationBoundary>,
    );

    expect(screen.getByText("Child one")).toBeInTheDocument();
    expect(screen.getByText("Child two")).toBeInTheDocument();
  });
});
