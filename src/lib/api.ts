const API = import.meta.env.VITE_API_BASE;

// ── MEMBER AUTH ──────────────────────────────

export async function registerMember(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}) {
  const res = await fetch(`${API}/auth/register.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API}/auth/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    sessionStorage.setItem("waven_token", data.token);
    sessionStorage.setItem("waven_user", JSON.stringify(data.user));
  }
  return data;
}

export function getCurrentUser() {
  const u = sessionStorage.getItem("waven_user");
  return u ? JSON.parse(u) : null;
}

export function logoutUser() {
  sessionStorage.removeItem("waven_token");
  sessionStorage.removeItem("waven_user");
}

// ── OPEN RUNNER ──────────────────────────────

// Save or update open runner details
export async function saveOpenRunner(data: {
  name: string;
  email: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}) {
  const res = await fetch(`${API}/auth/open-runner.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Look up saved details by email (for pre-fill)
export async function lookupRunner(email: string) {
  const res = await fetch(`${API}/auth/lookup-runner.php?email=${encodeURIComponent(email)}`);
  return res.json();
}
