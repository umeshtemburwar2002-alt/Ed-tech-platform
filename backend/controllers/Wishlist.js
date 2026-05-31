const supabase = require("../config/supabaseAdmin");

exports.addToWishlist = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Check if already in wishlist
        const { data: existing, error: checkError } = await supabase
            .from('wishlist')
            .select('*')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Course already in wishlist",
            });
        }

        const { error: insertError } = await supabase
            .from('wishlist')
            .insert([
                { student_id: studentId, course_id: courseId }
            ]);

        // 23505 = duplicate key value violates unique constraint
        if (insertError) {
            if (insertError.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: "Course already in wishlist",
                });
            }
            throw insertError;
        }

        return res.status(200).json({
            success: true,
            message: "Course added to wishlist successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error adding course to wishlist",
            error: error.message,
        });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const { error: deleteError } = await supabase
            .from('wishlist')
            .delete()
            .eq('student_id', studentId)
            .eq('course_id', courseId);

        if (deleteError) throw deleteError;

        return res.status(200).json({
            success: true,
            message: "Course removed from wishlist successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error removing course from wishlist",
            error: error.message,
        });
    }
};

exports.getWishlist = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { data: wishlist, error } = await supabase
            .from('wishlist')
            .select('*, courses(*)')
            .eq('student_id', studentId);

        if (error) throw error;

        // Extract courses from wishlist
        const courses = wishlist.map(item => item.courses).filter(course => course !== null);

        return res.status(200).json({
            success: true,
            message: "Wishlist fetched successfully",
            data: courses,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching wishlist",
            error: error.message,
        });
    }
};
