const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000/api/v1"

// AUTH ENDPOINTS
export const endpoints = {
  SENDOTP_API: BASE_URL + "/auth/sendotp",
  SIGNUP_API: BASE_URL + "/auth/signup",
  LOGIN_API: BASE_URL + "/auth/login",
  RESETPASSTOKEN_API: BASE_URL + "/auth/reset-password-token",
  RESETPASSWORD_API: BASE_URL + "/auth/reset-password",
}

// PROFILE ENDPOINTS
export const profileEndpoints = {
  GET_USER_DETAILS_API: BASE_URL + "/profile/getUserDetails",
  GET_USER_ENROLLED_COURSES_API: BASE_URL + "/profile/getEnrolledCourses",
  GET_INSTRUCTOR_DATA_API: BASE_URL + "/profile/instructorDashboard",
}

// STUDENTS ENDPOINTS
export const studentEndpoints = {
  COURSE_PAYMENT_API: BASE_URL + "/payment/capturePayment",
  COURSE_VERIFY_API: BASE_URL + "/payment/verifyPayment",
  SEND_PAYMENT_SUCCESS_EMAIL_API: BASE_URL + "/payment/sendPaymentSuccessEmail",
  PAYMENT_HISTORY_API: BASE_URL + "/payment/history",
}

// COURSE ENDPOINTS
export const courseEndpoints = {
  GET_ALL_COURSE_API: BASE_URL + "/course/getAllCourses",
  COURSE_DETAILS_API: BASE_URL + "/course/getCourseDetails",
  EDIT_COURSE_API: BASE_URL + "/course/editCourse",
  COURSE_CATEGORIES_API: BASE_URL + "/course/showAllCategories",
  CREATE_COURSE_API: BASE_URL + "/course/createCourse",
  CREATE_SECTION_API: BASE_URL + "/course/addSection",
  CREATE_SUBSECTION_API: BASE_URL + "/course/addSubSection",
  UPDATE_SECTION_API: BASE_URL + "/course/updateSection",
  UPDATE_SUBSECTION_API: BASE_URL + "/course/updateSubSection",
  GET_ALL_INSTRUCTOR_COURSES_API: BASE_URL + "/course/getInstructorCourses",
  DELETE_SECTION_API: BASE_URL + "/course/deleteSection",
  DELETE_SUBSECTION_API: BASE_URL + "/course/deleteSubSection",
  DELETE_COURSE_API: BASE_URL + "/course/deleteCourse",
  GET_FULL_COURSE_DETAILS_AUTHENTICATED:
    BASE_URL + "/course/getFullCourseDetails",
  LECTURE_COMPLETION_API: BASE_URL + "/course/updateCourseProgress",
  CREATE_RATING_API: BASE_URL + "/course/createRating",
  ENROLL_FREE_API: BASE_URL + "/course/enroll/free",
  ENROLL_PAID_API: BASE_URL + "/course/enroll/paid",
  CHECK_ENROLLMENT_API: BASE_URL + "/course/enroll/check",
}

// RATINGS AND REVIEWS
export const ratingsEndpoints = {
  REVIEWS_DETAILS_API: BASE_URL + "/course/getReviews",
}

// CATAGORIES API
export const categories = {
  CATEGORIES_API: BASE_URL + "/course/showAllCategories",
}

// CATALOG PAGE DATA
export const catalogData = {
  CATALOGPAGEDATA_API: BASE_URL + "/course/getCategoryPageDetails",
}
// CONTACT-US API
export const contactusEndpoint = {
  CONTACT_US_API: BASE_URL + "/reach/contact",
}

// SETTINGS ENDPOINTS
export const settingsEndpoints = {
  UPDATE_DISPLAY_PICTURE_API: BASE_URL + "/profile/updateDisplayPicture",
  UPDATE_PROFILE_API: BASE_URL + "/profile/updateProfile",
  CHANGE_PASSWORD_API: BASE_URL + "/auth/changepassword",
  DELETE_PROFILE_API: BASE_URL + "/profile/deleteProfile",
}

// MEGA MENU ENDPOINTS
export const megaMenuEndpoints = {
  GET_CATEGORIES_API: BASE_URL + "/mega-menu/categories",
  GET_TRENDING_COURSES_API: BASE_URL + "/mega-menu/trending-courses",
  GET_RECENT_COURSES_API: BASE_URL + "/mega-menu/recent-courses/:userId",
  GET_FAVORITES_API: BASE_URL + "/mega-menu/favorites/:userId",
  GET_MY_COURSES_API: BASE_URL + "/mega-menu/my-courses/:userId",
}

// DASHBOARD ENDPOINTS
export const dashboardEndpoints = {
  STUDENT_DASHBOARD_REALTIME_API: BASE_URL + "/dashboard/student/realtime",
  INSTRUCTOR_DASHBOARD_REALTIME_API: BASE_URL + "/dashboard/instructor/realtime",
  UPDATE_ACTIVITY_API: BASE_URL + "/dashboard/activity/update",
  REALTIME_NOTIFICATIONS_API: BASE_URL + "/dashboard/notifications/realtime",
}

// NOTIFICATION ENDPOINTS
export const notificationEndpoints = {
  GET_NOTIFICATIONS_API: BASE_URL + "/notifications",
  GET_UNREAD_COUNT_API: BASE_URL + "/notifications/unread-count",
  MARK_NOTIFICATION_READ_API: BASE_URL + "/notifications/:notificationId/read",
  MARK_ALL_READ_API: BASE_URL + "/notifications/mark-all-read",
  DELETE_NOTIFICATION_API: BASE_URL + "/notifications/:notificationId",
  CLEAR_ALL_NOTIFICATIONS_API: BASE_URL + "/notifications/clear-all",
  SEND_NOTIFICATION_API: BASE_URL + "/notifications/send",
  BROADCAST_NOTIFICATION_API: BASE_URL + "/notifications/broadcast",
}

// ADMIN ENDPOINTS
export const adminEndpoints = {
  OVERVIEW: BASE_URL + "/admin/overview",
  USERS: BASE_URL + "/admin/users",
  BAN_USER: BASE_URL + "/admin/users/:id/ban",
  DELETE_USER: BASE_URL + "/admin/users/:id",
  COURSES: BASE_URL + "/admin/courses",
  APPROVE_COURSE: BASE_URL + "/admin/courses/:id/approve",
  EDIT_COURSE: BASE_URL + "/admin/courses/:id",
  DELETE_COURSE: BASE_URL + "/admin/courses/:id",
  REPORTS: BASE_URL + "/admin/reports/summary",
}
