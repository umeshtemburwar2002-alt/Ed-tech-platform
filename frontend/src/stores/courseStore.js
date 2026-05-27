import { create } from "zustand";

const useCourseStore = create((set, get) => ({
  // Course data
  courses: [],
  selectedCourse: null,
  sections: [],
  lessons: [],
  selectedLesson: null,

  // Filters
  filters: {
    status: "all",
    search: "",
    sort: "newest",
  },

  // Setters
  setCourses: (courses) => set({ courses }),
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  setSections: (sections) => set({ sections }),
  setLessons: (lessons) => set({ lessons }),
  setSelectedLesson: (lesson) => set({ selectedLesson: lesson }),
  
  // Filter setters
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  // Update single course in list (for realtime)
  updateCourseInList: (updatedCourse) => {
    set((state) => ({
      courses: state.courses.map((course) =>
        course.id === updatedCourse.id ? updatedCourse : course
      ),
      selectedCourse:
        state.selectedCourse?.id === updatedCourse.id
          ? updatedCourse
          : state.selectedCourse,
    }));
  },

  // Add course to list
  addCourseToList: (newCourse) => {
    set((state) => ({
      courses: [newCourse, ...state.courses],
    }));
  },

  // Remove course from list
  removeCourseFromList: (courseId) => {
    set((state) => ({
      courses: state.courses.filter((course) => course.id !== courseId),
      selectedCourse:
        state.selectedCourse?.id === courseId ? null : state.selectedCourse,
    }));
  },

  // Add section
  addSection: (section) => {
    set((state) => ({
      sections: [...state.sections, section],
    }));
  },

  // Update section
  updateSection: (updatedSection) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === updatedSection.id ? updatedSection : section
      ),
    }));
  },

  // Remove section
  removeSection: (sectionId) => {
    set((state) => ({
      sections: state.sections.filter((section) => section.id !== sectionId),
    }));
  },

  // Add lesson
  addLesson: (lesson) => {
    set((state) => ({
      lessons: [...state.lessons, lesson],
    }));
  },

  // Update lesson
  updateLesson: (updatedLesson) => {
    set((state) => ({
      lessons: state.lessons.map((lesson) =>
        lesson.id === updatedLesson.id ? updatedLesson : lesson
      ),
      selectedLesson:
        state.selectedLesson?.id === updatedLesson.id
          ? updatedLesson
          : state.selectedLesson,
    }));
  },

  // Remove lesson
  removeLesson: (lessonId) => {
    set((state) => ({
      lessons: state.lessons.filter((lesson) => lesson.id !== lessonId),
      selectedLesson:
        state.selectedLesson?.id === lessonId ? null : state.selectedLesson,
    }));
  },

  // Reset state
  reset: () =>
    set({
      courses: [],
      selectedCourse: null,
      sections: [],
      lessons: [],
      selectedLesson: null,
      filters: {
        status: "all",
        search: "",
        sort: "newest",
      },
    }),
}));

export default useCourseStore;