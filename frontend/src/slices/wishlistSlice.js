import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    wishlist: [],
    loading: false,
};

const wishlistSlice = createSlice({
    name: "wishlist",
    initialState,
    reducers: {
        setWishlist: (state, action) => {
            state.wishlist = action.payload;
        },
        addToWishlistState: (state, action) => {
            state.wishlist.push(action.payload);
        },
        removeFromWishlistState: (state, action) => {
            state.wishlist = state.wishlist.filter((course) => course.id !== action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        resetWishlist: (state) => {
            state.wishlist = [];
        }
    },
});

export const { setWishlist, addToWishlistState, removeFromWishlistState, setLoading, resetWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
