import { toast } from "react-hot-toast";
import { setLoading, setWishlist, addToWishlistState, removeFromWishlistState } from "../../slices/wishlistSlice";
import { supabase } from "../../config/supabaseClient";

export function fetchWishlist(token) {
    return async (dispatch, getState) => {
        dispatch(setLoading(true));
        try {
            const { profile } = getState();
            // If there's no auth or not logged in, just clear it
            if (!profile || !profile.user) {
                dispatch(setWishlist([]));
                dispatch(setLoading(false));
                return;
            }

            // In Supabase, we query the wishlist table and join with courses and categories
            const { data, error } = await supabase
                .from("wishlist")
                .select(`
                    id,
                    student_id,
                    course_id,
                    created_at,
                    courses:course_id (
                        id,
                        title,
                        description,
                        price,
                        thumbnail,
                        final_thumbnail_url,
                        youtube_thumbnail_url,
                        categories:category_id (name)
                    )
                `)
                .eq("student_id", profile.user.id);

            if (error) {
                throw error;
            }

            // Transform the data to match what the frontend expects (array of course objects)
            const formattedWishlist = data.map((item) => {
                const course = item.courses;
                return {
                    id: course.id,
                    _id: course.id, // For backwards compatibility
                    title: course.title,
                    description: course.description,
                    price: course.price,
                    thumbnail: course.final_thumbnail_url || course.youtube_thumbnail_url || course.thumbnail,
                    category: course.categories ? course.categories.name : "Uncategorized",
                    wishlist_id: item.id
                };
            });

            dispatch(setWishlist(formattedWishlist));
        } catch (error) {
            console.log("FETCH_WISHLIST ERROR............", error);
            if (error?.status !== 403) {
                toast.error("Could not fetch wishlist");
            }
        }
        dispatch(setLoading(false));
    };
}

export function addToWishlist(courseId, course, token) {
    return async (dispatch, getState) => {
        try {
            const { profile } = getState();
            if (!profile || !profile.user) {
                toast.error("Please login to add to wishlist");
                return;
            }

            const { data, error } = await supabase
                .from("wishlist")
                .insert({
                    student_id: profile.user.id,
                    course_id: courseId
                })
                .select()
                .single();

            if (error) {
                // If it's a unique constraint violation (already in wishlist)
                if (error.code === '23505') {
                    toast.error("Course is already in your wishlist");
                    return;
                }
                throw error;
            }

            dispatch(addToWishlistState(course));
            toast.success("Course added to wishlist");
        } catch (error) {
            console.log("ADD_TO_WISHLIST ERROR............", error);
            toast.error("Could not add to wishlist");
        }
    };
}

export function removeFromWishlist(courseId, token) {
    return async (dispatch, getState) => {
        try {
            const { profile } = getState();
            if (!profile || !profile.user) {
                return;
            }

            const { error } = await supabase
                .from("wishlist")
                .delete()
                .eq("student_id", profile.user.id)
                .eq("course_id", courseId);

            if (error) {
                throw error;
            }

            dispatch(removeFromWishlistState(courseId));
            toast.success("Course removed from wishlist");
        } catch (error) {
            console.log("REMOVE_FROM_WISHLIST ERROR............", error);
            toast.error("Could not remove from wishlist");
        }
    };
}
