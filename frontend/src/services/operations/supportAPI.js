import { toast } from "react-hot-toast";
import { supabase } from "../../config/supabaseClient";

const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BASE_URL || "http://localhost:4000/api/v1";
const BASE = API_URL.endsWith('/api/v1') ? API_URL : `${API_URL}/api/v1`;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

// ─── Public / Guest ───────────────────────────────────────────────────────────

/**
 * Submit the public contact form — no auth required.
 */
export async function submitGuestContact({ name, email, subject, message }) {
  const toastId = toast.loading("Sending your message…");
  try {
    const { ok, data } = await apiFetch("/support/contact", {
      method: "POST",
      body: JSON.stringify({ name, email, subject, message }),
    });
    if (!ok) throw new Error(data.message || "Failed to send message");
    toast.success(data.message || "Message sent! We'll reply within 24 hours.", { id: toastId });
    return { success: true, ticketId: data.ticketId };
  } catch (err) {
    toast.error(err.message, { id: toastId });
    return { success: false };
  }
}

// ─── Authenticated ────────────────────────────────────────────────────────────

/**
 * Create a new support ticket (student or instructor).
 */
export async function createTicket({ subject, category, message, priority = "medium", attachment_url = null }) {
  const toastId = toast.loading("Submitting ticket…");
  try {
    const { ok, data } = await apiFetch("/support/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, category, message, priority, attachment_url }),
    });
    if (!ok) throw new Error(data.message || "Failed to create ticket");
    toast.success(`Ticket #${data.data.id.slice(0, 8).toUpperCase()} created!`, { id: toastId });
    return { success: true, ticket: data.data };
  } catch (err) {
    toast.error(err.message, { id: toastId });
    return { success: false };
  }
}

/**
 * Fetch all tickets for the logged-in user.
 * @param {{ status?: string, priority?: string, search?: string }} filters
 */
export async function getMyTickets(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status)   params.set("status",   filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search)   params.set("search",   filters.search);
    const qs = params.toString() ? `?${params}` : "";

    const { ok, data } = await apiFetch(`/support/tickets${qs}`);
    if (!ok) throw new Error(data.message);
    return data.data ?? [];
  } catch (err) {
    console.error("[getMyTickets]", err.message);
    return [];
  }
}

/**
 * Upload a screenshot/attachment and get back a public URL.
 * Uses Supabase Storage directly from the frontend for speed.
 */
export async function uploadSupportAttachment(file, userId) {
  const toastId = toast.loading("Uploading attachment…");
  try {
    const ext      = file.name.split(".").pop();
    const path     = `support/${userId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("support-attachments")
      .getPublicUrl(path);

    toast.success("File uploaded!", { id: toastId });
    return publicUrl;
  } catch (err) {
    toast.error(`Upload failed: ${err.message}`, { id: toastId });
    return null;
  }
}
