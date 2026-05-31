import { createSlice } from "@reduxjs/toolkit"
import { toast } from "react-hot-toast"

const initialState = {
  cart: localStorage.getItem("cart")
    ? JSON.parse(localStorage.getItem("cart"))
    : [],
  total: localStorage.getItem("total")
    ? JSON.parse(localStorage.getItem("total"))
    : 0,
  totalItems: localStorage.getItem("totalItems")
    ? JSON.parse(localStorage.getItem("totalItems"))
    : 0,
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const course = action.payload
      
      // Safe check for course and ID
      if (!course || !(course._id || course.id)) {
        console.error("Invalid course data passed to addToCart:", course);
        return;
      }

      const index = state.cart.findIndex((item) => (item._id || item.id) === (course._id || course.id))

      if (index > -1) {
        // If the course is already in the cart, do not modify the quantity
        toast.error("Course already in cart")
        return
      }
      // If the course is not in the cart, add it to the cart
      state.cart.push(course)
      // Update the total quantity and price
      state.totalItems++
      
      // Safe price parsing handling both price and salePrice
      const priceValue = course.salePrice || course.price || 0;
      const parsedPrice = typeof priceValue === 'string' 
        ? Number(priceValue.replace(/[^\d]/g, '')) 
        : Number(priceValue);
      
      state.total += parsedPrice;
      
      // Update to localstorage
      localStorage.setItem("cart", JSON.stringify(state.cart))
      localStorage.setItem("total", JSON.stringify(state.total))
      localStorage.setItem("totalItems", JSON.stringify(state.totalItems))
      // show toast
      toast.success("Course added to cart")
    },
    removeFromCart: (state, action) => {
      const courseId = action.payload
      const index = state.cart.findIndex((item) => (item._id || item.id) === courseId)

      if (index > -1) {
        // Safe price parsing for removal
        const course = state.cart[index];
        const priceValue = course.salePrice || course.price || 0;
        const parsedPrice = typeof priceValue === 'string' 
          ? Number(priceValue.replace(/[^\d]/g, '')) 
          : Number(priceValue);

        // If the course is found in the cart, remove it
        state.totalItems--
        state.total -= parsedPrice;
        state.cart.splice(index, 1)
        
        // Update to localstorage
        localStorage.setItem("cart", JSON.stringify(state.cart))
        localStorage.setItem("total", JSON.stringify(state.total))
        localStorage.setItem("totalItems", JSON.stringify(state.totalItems))
        // show toast
        toast.success("Course removed from cart")
      }
    },
    resetCart: (state) => {
      state.cart = []
      state.total = 0
      state.totalItems = 0
      // Update to localstorage
      localStorage.removeItem("cart")
      localStorage.removeItem("total")
      localStorage.removeItem("totalItems")
    },
  },
})

export const { addToCart, removeFromCart, resetCart } = cartSlice.actions

export default cartSlice.reducer