import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { apiClient } from "./services/api-client";

vi.mock("./services/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn()
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setRefreshTokenHandler: vi.fn(),
  API_BASE_URL: "/api"
}));

const mockedApiClient = vi.mocked(apiClient);

function visit(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
});

describe("App routing", () => {
  it("renders the public home page for anonymous users", async () => {
    visit("/");

    expect(await screen.findByRole("heading", { name: /bring lost pets home/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /log in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /report found pet/i }).length).toBeGreaterThan(0);
  });

  it("redirects protected routes to login when no access token is stored", async () => {
    visit("/dashboard");

    expect(await screen.findByRole("heading", { name: /sign in to petrecovery/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(mockedApiClient.get).not.toHaveBeenCalled();
  });

  it("renders the registration form", async () => {
    visit("/register");

    expect(await screen.findByRole("heading", { name: /create your petrecovery account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByText(/verify you're human/i)).toBeInTheDocument();
  });

  it("loads the authenticated dashboard empty state", async () => {
    localStorage.setItem("access_token", "test-token");
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { user: { id: "user-1", email: "owner@example.com", is_premium: false } }
        });
      }
      if (url === "/pets") {
        return Promise.resolve({ data: { pets: [] } });
      }
      if (url === "/notifications") {
        return Promise.resolve({ data: { notifications: [] } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    visit("/dashboard");

    expect(await screen.findByRole("heading", { name: /my pets/i })).toBeInTheDocument();
    expect(await screen.findByText(/you haven't registered any pets yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+ add pet/i }).length).toBeGreaterThan(0);
  });
});
