import React from "react"
import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function AdminOpenRoute({ children }) {
  const { user } = useSelector((s) => s.profile)
  const role = String(user?.accountType || "").toLowerCase();
  if (user && role === "admin") return <Navigate to="/admin/dashboard" />
  if (user && role !== "admin") return <Navigate to="/403" />
  return children
}
