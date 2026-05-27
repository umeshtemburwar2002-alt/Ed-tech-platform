import React from "react"
import { NavLink, Outlet } from "react-router-dom"
import { FaTachometerAlt, FaUsers, FaBook, FaChartBar, FaClipboardList } from "react-icons/fa"

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#000814] text-white flex">
      <aside className="w-72 hidden md:block bg-white/5 border-r border-white/10 p-6">
        <div className="text-2xl font-extrabold tracking-tight">Admin</div>
        <nav className="mt-8 grid gap-2">
          <NavLink to="/admin/dashboard" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-yellow-400 text-black" : "hover:bg-white/10"}`}>
            <FaTachometerAlt /><span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-yellow-400 text-black" : "hover:bg-white/10"}`}>
            <FaUsers /><span>Users</span>
          </NavLink>
          <NavLink to="/admin/courses" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-yellow-400 text-black" : "hover:bg-white/10"}`}>
            <FaBook /><span>Courses</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-yellow-400 text-black" : "hover:bg-white/10"}`}>
            <FaChartBar /><span>Reports</span>
          </NavLink>
          <NavLink to="/admin/enrollments" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-yellow-400 text-black" : "hover:bg-white/10"}`}>
            <FaClipboardList /><span>Enrollments</span>
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  )
}
