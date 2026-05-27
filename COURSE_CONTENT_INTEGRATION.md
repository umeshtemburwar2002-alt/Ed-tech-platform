# What You'll Learn & Course Content - Integration Guide

## 📋 Overview
इस guide में हमने "What You'll Learn" और "Course Content" के लिए database tables और React components बनाए हैं जो create course page में integrate होंगे।

## 🗄️ Database Tables

### Files Created:
1. `docs/sql/course_content_tables.sql` - Complete SQL migration for new tables

### Tables Added:
1. **course_learning_points** - "What You'll Learn" के लिए
2. **course_sections** - Course content sections के लिए (enhanced)
3. **course_lessons** - Course content lessons के लिए (enhanced)
4. **course_content_view** - Easy access के लिए view

### Features:
- ✅ RLS policies for security
- ✅ Automatic metrics calculation
- ✅ Helper functions for easy queries
- ✅ Triggers for real-time updates

## 🔧 React Hooks

### Files Created:
1. `frontend/src/hooks/useLearningPoints.js` - Learning points CRUD operations
2. `frontend/src/hooks/useCourseContent.js` - Course content CRUD operations

### Features:
- ✅ Full CRUD operations
- ✅ Batch operations
- ✅ Error handling with toast notifications
- ✅ Loading states
- ✅ Database integration

## 🎨 React Components

### Files Created:
1. `frontend/src/components/course/WhatYouWillLearn.jsx` - Learning outcomes editor
2. `frontend/src/components/course/CourseContent.jsx` - Course curriculum display

### Features:
- ✅ Edit and display modes
- ✅ Real-time updates
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Error handling

## 🚀 Integration Steps

### Step 1: Run SQL Migration
```bash
# Go to Supabase dashboard > SQL Editor
# Run the complete migration from: docs/sql/course_content_tables.sql
```

### Step 2: Update CreateCourse.jsx
Add these imports at the top:
```javascript
import WhatYouWillLearn from "../components/course/WhatYouWillLearn";
import CourseContent from "../components/course/CourseContent";
import useLearningPoints from "../hooks/useLearningPoints";
import useCourseContent from "../hooks/useCourseContent";
```

Add hooks inside the component:
```javascript
const { batchCreateLearningPoints } = useLearningPoints();
const { fetchCourseContent } = useCourseContent();
```

### Step 3: Replace "What You'll Learn" Section
Find the existing learning outcomes section and replace with:
```javascript
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-900 dark:text-white">
    What students will learn *
  </label>
  <WhatYouWillLearn
    courseId={existingCourseId || null}
    editable={true}
    initialPoints={formData.learning_outcomes.map((outcome, index) => ({
      id: `temp-${index}`,
      title: outcome,
      description: "",
      order_index: index,
    }))}
    onChange={(points) => {
      setFormData(prev => ({
        ...prev,
        learning_outcomes: points.map(p => p.title)
      }));
    }}
    onSave={async () => {
      if (existingCourseId) {
        // Data is already saved by the component
      }
    }}
  />
</div>
```

### Step 4: Add "Course Content" Section
Add this after the basic course info:
```javascript
<div className="space-y-4">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
    Course Content
  </h2>
  {existingCourseId ? (
    <CourseContent
      courseId={existingCourseId}
      editable={true}
      onLessonClick={(lesson) => console.log("Lesson clicked:", lesson)}
      onSectionEdit={(section) => console.log("Section edit:", section)}
    />
  ) : (
    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <p className="text-gray-500 dark:text-gray-400">
        Save the course first to add course content
      </p>
    </div>
  )}
</div>
```

### Step 5: Update Course Creation Handler
When creating a course, also save learning points:
```javascript
const handleSubmit = async (values) => {
  // ... existing code ...

  const courseData = {
    // ... existing fields ...
    learning_outcomes: formData.learning_outcomes, // Keep for backward compatibility
  };

  if (existingCourseId) {
    await updateCourse(existingCourseId, courseData);
    
    // Save learning points to database
    if (formData.learning_outcomes.length > 0) {
      await batchCreateLearningPoints(existingCourseId, formData.learning_outcomes);
    }
  } else {
    const { data } = await createCourse(courseData);
    if (data) {
      setExistingCourseId(data.id);
      
      // Save learning points to database
      if (formData.learning_outcomes.length > 0) {
        await batchCreateLearningPoints(data.id, formData.learning_outcomes);
      }
    }
  }
};
```

## 📊 Usage Examples

### Display Mode (Student View)
```javascript
<CourseDetails courseId={course.id}>
  <WhatYouWillLearn
    courseId={course.id}
    editable={false}
    initialPoints={course.learning_points}
  />
  <CourseContent
    courseId={course.id}
    editable={false}
    onLessonClick={(lesson) => navigateToLesson(lesson.id)}
  />
</CourseDetails>
```

### Edit Mode (Instructor View)
```javascript
<CourseEditor courseId={course.id}>
  <WhatYouWillLearn
    courseId={course.id}
    editable={true}
    onSave={() => toast.success("Learning points saved")}
  />
  <CourseContent
    courseId={course.id}
    editable={true}
    onLessonClick={(lesson) => editLesson(lesson.id)}
    onSectionEdit={(section) => editSection(section.id)}
  />
</CourseEditor>
```

## 🔍 Testing

### Test Learning Points:
1. Create a new course
2. Add learning outcomes using the component
3. Check if they appear in the database
4. Edit and delete learning points
5. Reorder points (drag-and-drop coming soon)

### Test Course Content:
1. Save a course first
2. Add sections to the course
3. Add lessons to sections
4. Expand/collapse sections
5. Check the course metrics

## 🐛 Troubleshooting

### Issue: "relation does not exist" error
**Solution:** Run the SQL migration in Supabase SQL Editor

### Issue: Learning points not saving
**Solution:** Make sure courseId is available and the hooks are properly initialized

### Issue: Course content not loading
**Solution:** Check that the course is saved first and courseId is passed correctly

### Issue: Permission denied errors
**Solution:** Verify RLS policies are correctly set up and user is authenticated

## 📝 Notes

- Learning points are stored in `course_learning_points` table
- Course content is stored in `course_sections` and `course_lessons` tables
- Components work both in edit mode (instructors) and display mode (students)
- For new courses, data is stored locally until the course is saved
- After saving, data is automatically synced with the database

## 🎯 Next Steps

After integration:
1. Add drag-and-drop for reordering
2. Add lesson editor component
3. Add resource upload functionality
4. Add progress tracking
5. Add preview functionality

---

**Generated with [Devin](https://cli.devin.ai/docs)**