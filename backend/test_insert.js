const supabase = require("./config/supabase");

async function test() {
  try {
    const studentId = "98d42e3d-f83b-4d76-9b97-223c333d18d7";
    const resolvedCourseId = "a7a82854-61f5-454d-95ff-f0403d1f3efe"; // Paid course from log

    console.log("Starting paid enrollment test insert...");
    const { data, error } = await supabase
      .from('enrollments')
      .insert([{
        student_id: studentId,
        course_id: resolvedCourseId,
        enrollment_status: 'active',
        payment_status: 'paid',
        payment_id: 'pay_sim_' + Math.random().toString(36).substr(2, 9),
        enrollment_type: 'paid',
        active: true,
        enrolled_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase returned error for paid enrollment:", error);
    } else {
      console.log("Success! Paid enrollment inserted:", data);
      
      // Delete the inserted row to keep database clean
      const { error: delError } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', data.id);
      console.log("Cleanup delete error status:", delError);
    }
  } catch (err) {
    console.error("Caught javascript exception:", err);
  }
}

test();
