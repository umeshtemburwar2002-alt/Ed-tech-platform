import { ACCOUNT_TYPE } from "../utils/constants";

export const sidebarLinks = [
  // Common Features
  {
    id: 1,
    name: "My Profile",
    path: "/dashboard/my-profile",
    icon: "VscAccount",
    description: "Manage personal information, profile picture, and account settings"
  },
  {
    id: 2,
    name: "Theme",
    path: "/dashboard/theme",
    icon: "VscColorMode",
    description: "Customize dashboard appearance with dark/light themes and color preferences"
  },
  
  // Student-Focused Features
  {
    id: 3,
    name: "Learning Path",
    path: "/dashboard/learning-path",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscRocket",
    description: "Personalized learning journey with skill-based course recommendations"
  },
  {
    id: 4,
    name: "My Learning",
    path: "/dashboard/my-learning",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscBook",
    description: "Access all enrolled courses with progress tracking and continue learning"
  },
  
  // Core Student Features
  {
    id: 6,
    name: "Progress",
    path: "/dashboard/progress",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscGraph",
    description: "Track learning progress with detailed analytics and milestone achievements"
  },
  {
    id: 7,
    name: "Assignments",
    path: "/dashboard/assignments",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscTasklist",
    description: "Access and submit assignments with deadline tracking and grade history"
  },
  {
    id: 8,
    name: "My Notes",
    path: "/dashboard/my-notes",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscNote",
    description: "Create, organize, and sync personal study notes across all courses"
  },
  {
    id: 9,
    name: "Achievements",
    path: "/dashboard/achievements",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscVerified",
    description: "View earned certificates, badges, and learning milestones"
  },
  {
    id: 10,
    name: "Study Groups",
    path: "/dashboard/study-groups",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscComment",
    description: "Join study groups, collaborate with peers, and participate in discussions"
  },
  {
    id: 12,
    name: "My Purchases",
    path: "/dashboard/purchase-history",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscHistory",
    description: "View payment history, invoices, and transaction logs"
  },
  {
    id: 11,
    name: "Settings",
    path: "/dashboard/settings",
    icon: "VscSettingsGear",
    description: "Manage account preferences, privacy settings, and notification controls"
  },
];
