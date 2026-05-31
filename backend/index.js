const express = require("express");
const app = express();

const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const paymentSecureRoutes = require("./routes/paymentSecureRoutes");
const adminRoutes = require("./routes/Admin");
const supportRoutes = require("./routes/Support");
const wishlistRoutes = require("./routes/Wishlist");
const cartRoutes = require("./routes/cart");
const notificationRoutes = require("./routes/notifications");
const createOrderRoutes = require("./routes/createOrder");
const verifyPaymentRoutes = require("./routes/verifyPayment");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");

dotenv.config();
const PORT = process.env.PORT || 4001;

// ==========================================
// 1. Debugging Logs Middleware
// ==========================================
app.use((req, res, next) => {
    console.log(`\n========================================`);
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    console.log(`[REQ] Origin: ${req.headers.origin || 'No Origin'}`);
    console.log(`[REQ] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[REQ] Auth Token: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + "..." : "Missing"}`);
    console.log(`========================================`);
    next();
});

// ==========================================
// 2. CORS Middleware
// ==========================================
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://my-production-domain.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],
    optionsSuccessStatus: 200
}));

// ==========================================
// 3. Body Parsers
// ==========================================
app.use(express.json());
app.use(cookieParser());

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp",
    })
);

// cloudinary connection
cloudinaryConnect();

// ==========================================
// 4. Routes
// ==========================================
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/payment", paymentSecureRoutes);
app.use("/api/v1/enrollment", paymentSecureRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ─── Razorpay Standard Checkout routes (/api/create-order & /api/verify-payment) ───
app.use("/api/create-order", createOrderRoutes);
app.use("/api/verify-payment", verifyPaymentRoutes);

// Razorpay checkout exact route compatibility (legacy)
const razorpayInstance = require("./config/razorpay");
app.post("/api/create-razorpay-order", async (req, res) => {
    const { amount, currency, receipt, notes } = req.body;
    try {
        const order = await razorpayInstance.orders.create({ amount, currency, receipt, notes });
        res.json(order);
    } catch (err) {
        console.error("Exact razorpay order creation error:", err);
        res.status(500).json({ error: err.message });
    }
});

// default route
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your server is up and running....",
    });
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
    console.error("Error:", err);

    // CRITICAL: Always return JSON, never HTML
    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

// 404 handler (must be after all routes and error handler)
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.path
    });
});

app.listen(PORT, () => {
    console.log(`App is running at ${PORT}`);
});
