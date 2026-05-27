// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENROLLMENT DASHBOARD - FIXED VERSION
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";

export default function AdminEnrollmentDashboard() {
    const [enrollments, setEnrollments] = useState([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState("all"); // all, free, paid
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState({
        total: 0,
        free: 0,
        paid: 0,
        revenue: 0
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH ENROLLMENTS WITH CORRECT SCHEMA
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            setError(null);

            // ✅ FIXED: Use correct column names
            // - student_id (NOT user_id)
            // - first_name, last_name (NOT full_name)
            const { data, error: fetchError } = await supabase
                .from("enrollments")
                .select(`
                    id,
                    enrolled_at,
                    enrollment_type,
                    payment_status,
                    amount_paid,
                    razorpay_payment_id,
                    student_id,
                    course_id,
                    profiles:student_id (
                        id,
                        first_name,
                        last_name,
                        email
                    ),
                    courses:course_id (
                        id,
                        title,
                        price,
                        is_free,
                        instructor_id,
                        profiles:instructor_id (
                            id,
                            first_name,
                            last_name
                        )
                    )
                `)
                .order("enrolled_at", { ascending: false });

            if (fetchError) {
                console.error("Supabase fetch error:", fetchError);
                throw new Error(fetchError.message || "Failed to fetch enrollments");
            }

            if (!data) {
                setEnrollments([]);
                setFilteredEnrollments([]);
                return;
            }

            // ✅ Process data and calculate stats
            setEnrollments(data);
            calculateStats(data);
            applyFilters(data, filterType, searchTerm);

        } catch (err) {
            console.error("Error fetching enrollments:", err);
            setError(err.message || "Failed to load enrollments");
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE STATISTICS
    // ─────────────────────────────────────────────────────────────────────────
    const calculateStats = (data) => {
        const total = data.length;
        const freeCount = data.filter(e => e.enrollment_type === "free").length;
        const paidCount = data.filter(e => e.enrollment_type === "paid").length;
        const revenue = data
            .filter(e => e.payment_status === "completed" && e.amount_paid)
            .reduce((sum, e) => sum + (Number(e.amount_paid) || 0), 0);

        setStats({
            total,
            free: freeCount,
            paid: paidCount,
            revenue
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY FILTERS AND SEARCH
    // ─────────────────────────────────────────────────────────────────────────
    const applyFilters = (data, type, search) => {
        let filtered = data;

        // Filter by type
        if (type === "free") {
            filtered = filtered.filter(e => e.enrollment_type === "free");
        } else if (type === "paid") {
            filtered = filtered.filter(e => e.enrollment_type === "paid");
        }

        // Filter by search term
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(e => {
                const studentName = `${e.profiles?.first_name || ""} ${e.profiles?.last_name || ""}`.toLowerCase();
                const studentEmail = (e.profiles?.email || "").toLowerCase();
                const courseName = (e.courses?.title || "").toLowerCase();

                return (
                    studentName.includes(searchLower) ||
                    studentEmail.includes(searchLower) ||
                    courseName.includes(searchLower)
                );
            });
        }

        setFilteredEnrollments(filtered);
    };

    // Handle filter change
    const handleFilterChange = (type) => {
        setFilterType(type);
        applyFilters(enrollments, type, searchTerm);
    };

    // Handle search change
    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(enrollments, filterType, term);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER LOADING STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                    <p className="text-white mt-4">Loading enrollments...</p>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER ERROR STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-900 border border-red-700 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Error Loading Enrollments</h2>
                        <p className="text-red-200 mb-4">{error}</p>
                        <button
                            onClick={fetchEnrollments}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Enrollment Dashboard</h1>
                    <p className="text-gray-400">Manage and monitor all course enrollments</p>
                </div>

                {/* STATISTICS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2">Total Enrollments</p>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2">Free Enrollments</p>
                        <p className="text-3xl font-bold text-green-400">{stats.free}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2">Paid Enrollments</p>
                        <p className="text-3xl font-bold text-blue-400">{stats.paid}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
                        <p className="text-3xl font-bold text-purple-400">₹{stats.revenue.toFixed(2)}</p>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Filter by Type */}
                        <div>
                            <label className="block text-white font-semibold mb-3">Filter by Type</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleFilterChange("all")}
                                    className={`px-4 py-2 rounded-lg transition ${
                                        filterType === "all"
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => handleFilterChange("free")}
                                    className={`px-4 py-2 rounded-lg transition ${
                                        filterType === "free"
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    Free
                                </button>
                                <button
                                    onClick={() => handleFilterChange("paid")}
                                    className={`px-4 py-2 rounded-lg transition ${
                                        filterType === "paid"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-white font-semibold mb-3">Search</label>
                            <input
                                type="text"
                                placeholder="Search by student name, email, or course..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ENROLLMENTS TABLE */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    {filteredEnrollments.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-gray-400">No enrollments found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-700 border-b border-gray-600">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Student</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Email</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Course</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Type</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Status</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Amount</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Payment ID</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">Enrolled</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEnrollments.map((enrollment) => (
                                        <tr key={enrollment.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                                            <td className="px-6 py-4 text-white">
                                                {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                {enrollment.profiles?.email}
                                            </td>
                                            <td className="px-6 py-4 text-white">
                                                {enrollment.courses?.title}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    enrollment.enrollment_type === "free"
                                                        ? "bg-green-900 text-green-200"
                                                        : "bg-blue-900 text-blue-200"
                                                }`}>
                                                    {enrollment.enrollment_type === "free" ? "Free" : "Paid"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    enrollment.payment_status === "completed"
                                                        ? "bg-green-900 text-green-200"
                                                        : enrollment.payment_status === "pending"
                                                        ? "bg-yellow-900 text-yellow-200"
                                                        : "bg-red-900 text-red-200"
                                                }`}>
                                                    {enrollment.payment_status === "not_required" ? "N/A" : enrollment.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-white">
                                                {enrollment.amount_paid ? `₹${enrollment.amount_paid}` : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 text-sm">
                                                {enrollment.razorpay_payment_id ? enrollment.razorpay_payment_id.substring(0, 15) + "..." : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 text-sm">
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RESULTS COUNT */}
                <div className="mt-6 text-gray-400 text-sm">
                    Showing {filteredEnrollments.length} of {enrollments.length} enrollments
                </div>
            </div>
        </div>
    );
}
