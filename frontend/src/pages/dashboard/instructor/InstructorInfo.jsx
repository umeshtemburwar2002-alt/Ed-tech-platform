import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "../../../config/supabaseClient";
import {
  User,
  Briefcase,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Award,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  Save,
  Edit3,
  Loader2,
  Users,
  IndianRupee,
  Activity
} from "lucide-react";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

const STATUS_COLORS = {
  completed: "from-emerald-500/20 to-emerald-500/10 border-emerald-500/40 text-emerald-400",
  pending: "from-amber-500/20 to-amber-500/10 border-amber-500/40 text-amber-400",
  rejected: "from-rose-500/20 to-rose-500/10 border-rose-500/40 text-rose-400",
  approved: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/40 text-cyan-400",
};

const STATUS_ICONS = {
  completed: CheckCircle2,
  pending: Clock,
  rejected: AlertCircle,
  approved: ShieldCheck,
};

export default function InstructorInfo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [instructorData, setInstructorData] = useState(null);

  const fetchInstructorData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: profile, error: profileError },
        { data: skills, error: skillsError },
        { data: documents, error: docsError },
        { data: payout, error: payoutError },
      ] = await Promise.all([
        supabase.from("instructor_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("instructor_skills").select("*").eq("user_id", user.id),
        supabase.from("instructor_documents").select("*").eq("user_id", user.id),
        supabase.from("instructor_payouts").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (skillsError) throw skillsError;
      if (docsError) throw docsError;
      if (payoutError) throw payoutError;

      setInstructorData({
        profile,
        skills,
        documents,
        payout,
        user,
      });
    } catch (err) {
      console.error("[InstructorInfo] Error fetching data:", err);
      toast.error("Failed to load instructor information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const calculateCompletion = () => {
    if (!instructorData) return 0;
    
    let completed = 0;
    let total = 4;

    if (instructorData.profile?.full_name) completed++;
    if (instructorData.skills && instructorData.skills.length > 0) completed++;
    if (instructorData.documents && instructorData.documents.length >= 2) completed++;
    if (instructorData.payout?.payout_account_token) completed++;

    return Math.round((completed / total) * 100);
  };

  const getStepStatus = (stepId) => {
    if (!instructorData) return "pending";
    
    switch (stepId) {
      case 1:
        return instructorData.profile?.full_name ? "completed" : "pending";
      case 2:
        return instructorData.skills && instructorData.skills.length > 0 ? "completed" : "pending";
      case 3:
        return instructorData.documents && instructorData.documents.length >= 2 ? "completed" : "pending";
      case 4:
        return instructorData.payout?.payout_account_token ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const isOnboardingComplete = instructorData?.profile?.onboarding_completed || calculateCompletion() === 100;
  const completionPercentage = calculateCompletion();

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading instructor information...</p>
        </div>
      </div>
    );
  }

  const onboardingSteps = [
    { id: 1, label: "Profile Completed", icon: User, description: "Basic profile information" },
    { id: 2, label: "Skills Added", icon: Briefcase, description: "Teaching skills and expertise" },
    { id: 3, label: "Documents Uploaded", icon: FileText, description: "Verification documents" },
    { id: 4, label: "Payout Setup", icon: DollarSign, description: "Payment information" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Instructor Info</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your instructor profile and onboarding status</p>
        </div>
        <button
          onClick={() => navigate("/instructor/setup")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200"
        >
          {isOnboardingComplete ? <Edit3 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {isOnboardingComplete ? "Edit Profile" : "Continue Setup"}
        </button>
      </div>

      {/* Quick Stats Summary */}
      {isOnboardingComplete && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Total Students", value: "1,234+", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { label: "Active Courses", value: "12", icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Lifetime Earnings", value: "₹45,678", icon: IndianRupee, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 rounded-2xl bg-white/5 border ${stat.border} shadow-xl flex items-center gap-4 hover:bg-white/10 transition-all backdrop-blur-xl`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isOnboardingComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-300">Complete your onboarding</h3>
              <p className="text-amber-200/80 text-sm mt-1">
                Your profile is {completionPercentage}% complete. Finish setting up to start publishing courses.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-amber-500/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  />
                </div>
                <span className="text-amber-300 font-bold text-sm min-w-[48px] text-right">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-violet-500/30">
                {(instructorData?.profile?.full_name?.[0] || instructorData?.user?.email?.[0] || "I").toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {instructorData?.profile?.full_name || "Instructor"}
                </h2>
                <p className="text-slate-400 text-sm">{instructorData?.user?.email}</p>
                {instructorData?.profile?.headline && (
                  <p className="text-violet-300 text-sm mt-1">{instructorData.profile.headline}</p>
                )}
              </div>
              {instructorData?.profile?.draft_saved && (
                <div className="ml-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                    <Save className="w-3 h-3" />
                    Draft Saved
                  </span>
                </div>
              )}
            </div>

            {instructorData?.profile?.about && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">About</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{instructorData.profile.about}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {instructorData?.profile?.location && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">📍</span>
                  <span>{instructorData.profile.location}</span>
                </div>
              )}
              {instructorData?.profile?.website && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">🔗</span>
                  <a href={instructorData.profile.website} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                    {instructorData.profile.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {instructorData?.profile?.timezone && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">🕐</span>
                  <span>{instructorData.profile.timezone}</span>
                </div>
              )}
            </div>

            {instructorData?.profile?.teaching_languages && instructorData.profile.teaching_languages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Teaching Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {instructorData.profile.teaching_languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-violet-500/15 border border-violet-500/35 text-violet-300 text-xs font-medium"
                    >
                      🌐 {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {instructorData?.skills && instructorData.skills.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">Skills</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {instructorData.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{skill.skill}</p>
                      <p className="text-xs text-slate-500">{skill.skill_category}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg capitalize ${
                      skill.proficiency_level === "expert" ? "bg-amber-500/10 text-amber-400" :
                      skill.proficiency_level === "advanced" ? "bg-violet-500/10 text-violet-400" :
                      skill.proficiency_level === "intermediate" ? "bg-cyan-500/10 text-cyan-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {skill.proficiency_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Onboarding Status</h3>
            </div>
            <div className="space-y-3">
              {onboardingSteps.map((step) => {
                const status = getStepStatus(step.id);
                const Icon = STATUS_ICONS[status];
                const StepIcon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${STATUS_COLORS[status]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <StepIcon className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-medium text-white">{step.label}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {instructorData?.documents && instructorData.documents.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">Documents</h3>
              </div>
              <div className="space-y-3">
                {instructorData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.original_filename}</p>
                      <p className="text-xs text-slate-500">
                        {(doc.file_size_bytes / 1024).toFixed(0)} KB · {doc.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {instructorData?.payout && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">Payout Info</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Provider</span>
                  <span className="text-sm font-medium text-white capitalize">{instructorData.payout.payout_provider}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Method</span>
                  <span className="text-sm font-medium text-white capitalize">{instructorData.payout.payout_method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Account</span>
                  <span className="text-sm font-medium text-white">•••• {instructorData.payout.payout_account_last4 || "4242"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Currency</span>
                  <span className="text-sm font-medium text-white">{instructorData.payout.currency || "USD"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
