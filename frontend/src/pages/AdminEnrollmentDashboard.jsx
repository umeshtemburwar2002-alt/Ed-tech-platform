// AdminEnrollmentDashboard.jsx
// Place this in: src/pages/AdminEnrollmentDashboard.jsx
//
// Use for ADMIN role → shows all enrollments across all courses/instructors
// Use for INSTRUCTOR role → shows only enrollments for their courses
//
// USAGE:
//   <AdminEnrollmentDashboard userId={currentUser.id} userRole={currentUser.role} />
//   userRole: "admin" | "instructor"

import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";

export default function AdminEnrollmentDashboard({ userId, userRole }) {
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({ total: 0, free: 0, paid: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "free" | "paid"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEnrollments();

    // Real-time: subscribe to new enrollments
    const channel = supabase
      .channel("enrollment-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_enrollments" },
        (payload) => {
          // Re-fetch when new enrollment arrives
          fetchEnrollments();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, userRole]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("course_enrollments")
        .select(`
          id,
          enrolled_at,
          payment_status,
          student_id,
          course_id,
          student_name,
          student_email,
          courses:course_id (
            title,
            price,
            is_free,
            instructor_id,
            profiles:instructor_id (
              full_name
            )
          )
        `)
        .order("enrolled_at", { ascending: false });

      // Instructors only see their own courses
      if (userRole === "instructor") {
        // Filter by courses where this user is the instructor
        // We join through courses table
        query = query.eq("courses.instructor_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out null joins (happens with instructor filter)
      const filtered = (data || []).filter((e) => e.courses !== null);
      setEnrollments(filtered);

      // Compute stats
      const total = filtered.length;
      const freeCount = filtered.filter((e) => e.payment_status === "Free").length;
      const paidCount = filtered.filter((e) => e.payment_status === "paid").length;
      const revenue = 0; // amount_paid not in course_enrollments

      setStats({ total, free: freeCount, paid: paidCount, revenue });
    } catch (err) {
      console.error("Error fetching enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter + search
  const displayEnrollments = enrollments.filter((e) => {
    const matchesFilter = filter === "all" || 
      (filter === "free" && e.payment_status === "Free") ||
      (filter === "paid" && e.payment_status === "paid");
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (e.student_name || "").toLowerCase().includes(q) ||
      (e.student_email || "").toLowerCase().includes(q) ||
      e.courses?.title?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#f9fafb", margin: "0 0 4px" }}>
          {userRole === "admin" ? "All Enrollments" : "My Course Enrollments"}
        </h1>
        <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
          Real-time student enrollment data
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "2rem" }}>
        {[
          { label: "Total Enrollments", value: stats.total, color: "#a78bfa" },
          { label: "Free Enrollments", value: stats.free, color: "#34d399" },
          { label: "Paid Enrollments", value: stats.paid, color: "#60a5fa" },
          ...(userRole === "admin" ? [{ label: "Total Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "#f59e0b" }] : []),
        ].map((stat) => (
          <div
            key={stat.label}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}
          >
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 8px" }}>{stat.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by student name, email, or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "240px", padding: "10px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#f9fafb", fontSize: "14px", outline: "none" }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          {["all", "free", "paid"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "10px 16px", background: filter === f ? "#7c3aed" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: filter === f ? "#fff" : "#9ca3af", cursor: "pointer", fontSize: "13px", fontWeight: 500, textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>Loading enrollments...</div>
        ) : displayEnrollments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No enrollments found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Student", "Email", "Course", ...(userRole === "admin" ? ["Instructor"] : []), "Type", "Amount", "Payment ID", "Date"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayEnrollments.map((e, i) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
                >
                  <td style={{ padding: "14px 16px", color: "#f9fafb", fontWeight: 500 }}>
                    {e.student_name || "—"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#9ca3af" }}>
                    {e.student_email || "—"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#f9fafb" }}>
                    {e.courses?.title || "—"}
                  </td>
                  {userRole === "admin" && (
                    <td style={{ padding: "14px 16px", color: "#9ca3af" }}>
                      {e.courses?.profiles?.full_name || "—"}
                    </td>
                  )}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                      background: e.payment_status === "paid" ? "rgba(96,165,250,0.15)" : "rgba(52,211,153,0.15)",
                      color: e.payment_status === "paid" ? "#60a5fa" : "#34d399",
                    }}>
                      {e.payment_status === "paid" ? "Paid" : "Free"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>—</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>—</td>
                  <td style={{ padding: "14px 16px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {formatDate(e.enrolled_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px" }}>
        Showing {displayEnrollments.length} of {enrollments.length} enrollments · Auto-updates in real-time
      </p>
    </div>
  );
}
