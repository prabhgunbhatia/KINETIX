/**
 * Authentication utilities and API client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_verified?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Get stored auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Store auth token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

/**
 * Remove auth token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
}

/**
 * Make authenticated API request
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and redirect to login
  if (response.status === 401) {
    removeAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  console.log("Making registration request to:", `${API_BASE_URL}/auth/register`);
  
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
    }),
  }).catch((error) => {
    console.error("Network error during registration:", error);
    throw new Error("Network error: Could not connect to server. Make sure the backend is running.");
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Registration failed" }));
    console.error("Registration error:", error);
    throw new Error(error.detail || "Registration failed");
  }

  const data = await response.json();
  console.log("Registration response:", data);
  
  // Ensure the response has the expected structure
  if (!data.access_token) {
    console.error("Invalid response structure:", data);
    throw new Error("Invalid response from server: missing access_token");
  }
  
  setAuthToken(data.access_token);
  
  // Return in the expected format
  return {
    access_token: data.access_token,
    token_type: data.token_type || "bearer",
    user: {
      id: data.user?.id || data.id,
      email: data.user?.email || data.email,
      full_name: data.user?.full_name,
      is_verified: data.user?.is_verified || false,
    },
  };
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }));
    console.error("Login error:", error);
    throw new Error(error.detail || "Login failed");
  }

  const data = await response.json();
  console.log("Login response:", data);
  
  // Ensure the response has the expected structure
  if (!data.access_token) {
    console.error("Invalid response structure:", data);
    throw new Error("Invalid response from server: missing access_token");
  }
  
  setAuthToken(data.access_token);
  
  // Return in the expected format
  return {
    access_token: data.access_token,
    token_type: data.token_type || "bearer",
    user: {
      id: data.user?.id || data.id,
      email: data.user?.email || data.email,
      full_name: data.user?.full_name,
      is_verified: data.user?.is_verified || false,
    },
  };
}

/**
 * Logout current user
 */
export function logout(): void {
  removeAuthToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest("/auth/me");
  
  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

