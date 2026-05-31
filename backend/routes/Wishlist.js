const express = require("express");
const router = express.Router();

const { addToWishlist, removeFromWishlist, getWishlist } = require("../controllers/Wishlist");
const { auth, isStudent } = require("../middleware/auth");

router.post("/:courseId", auth, isStudent, addToWishlist);
router.delete("/:courseId", auth, isStudent, removeFromWishlist);
router.get("/", auth, isStudent, getWishlist);

module.exports = router;
