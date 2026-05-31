import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { 
  FaUser, FaPhone, FaSave, FaTrash, FaInfoCircle, 
  FaVenusMars, FaCalendarAlt, FaExclamationTriangle 
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { updateProfile, deleteProfile } from "../../../services/operations/profileAPI";

export default function Settings() {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    contactNumber: user?.contactNumber || "",
    about: user?.about || "",
    gender: user?.gender || "",
    dateOfBirth: user?.dateOfBirth || "",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile(token, form));
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure? This will permanently delete your account and all associated progress.");
    if (!confirm) return;

    setDeleting(true);
    try {
      await dispatch(deleteProfile(token, navigate));
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-10"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <FaUser className="text-lg" />
          </div>
          Account Settings
        </h1>
        <p className="text-slate-400 text-sm">Manage your account information and preferences</p>
      </motion.div>

      <form onSubmit={saveProfile} className="space-y-8">
        {/* Personal Info Section */}
        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase tracking-wider">
            <FaInfoCircle />
            Personal Information
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">First Name</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Contact Number</label>
              <div className="relative">
                <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={updateField}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Gender</label>
              <div className="relative">
                <FaVenusMars className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <select
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                >
                  <option value="" className="bg-richblack-900">Select Gender</option>
                  <option value="Male" className="bg-richblack-900">Male</option>
                  <option value="Female" className="bg-richblack-900">Female</option>
                  <option value="Other" className="bg-richblack-900">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-300">About Me</label>
              <textarea
                name="about"
                rows="4"
                value={form.about}
                onChange={updateField}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 active:scale-[0.98]"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FaSave />
            )}
            Save Changes
          </button>
        </motion.div>
      </form>

      {/* Danger Zone Section */}
      <motion.div variants={itemVariants} className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 text-red-400 text-sm font-bold uppercase tracking-wider">
          <FaExclamationTriangle />
          Danger Zone
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Delete Account</h3>
            <p className="text-slate-400 text-sm">Once deleted, you cannot recover your account data.</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full md:w-auto px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            {deleting ? (
              <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
            ) : (
              <FaTrash />
            )}
            Delete Permanently
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
