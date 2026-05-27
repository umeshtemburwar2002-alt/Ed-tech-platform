# 🔐 SECURE PAYMENT API ENDPOINTS

## Base URL
```
http://localhost:5000/api/v1
```

---

## 📋 PAYMENT ENDPOINTS

### 1. CREATE RAZORPAY ORDER

**Endpoint:** `POST /payment/create-order`

**Authentication:** Required (JWT Token)

**Purpose:** Creates a Razorpay order for a paid course. Does NOT create enrollment.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 499
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderId": "order_1234567890",
  "amount": 49900,
  "currency": "INR",
  "totalAmount": 499,
  "message": "Order created successfully. Complete payment to enroll."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Course not found"
}
```

**Error Codes:**
- `400` - Missing courseId or amount
- `400` - Amount must be greater than 0
- `400` - Amount mismatch with course price
- `400` - Already enrolled in course
- `404` - Course not found
- `500` - Server error

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/payment/create-order \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 499
  }'
```

---

### 2. VERIFY PAYMENT & CREATE ENROLLMENT

**Endpoint:** `POST /payment/verify`

**Authentication:** Required (JWT Token)

**Purpose:** CRITICAL - Verifies Razorpay signature and creates enrollment ONLY after verification.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpayOrderId": "order_1234567890",
  "razorpayPaymentId": "pay_1234567890",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "courseId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified successfully. Enrollment created.",
  "enrollment": {
    "id": "enrollment-uuid",
    "student_id": "student-uuid",
    "course_id": "course-uuid",
    "enrollment_type": "paid",
    "payment_status": "completed",
    "razorpay_order_id": "order_1234567890",
    "razorpay_payment_id": "pay_1234567890",
    "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
    "amount_paid": 499,
    "active": true,
    "enrolled_at": "2024-05-28T10:30:00Z"
  }
}
```

**Response (Error - Signature Mismatch):**
```json
{
  "success": false,
  "message": "Payment verification failed. Signature mismatch.",
  "error": "INVALID_SIGNATURE"
}
```

**Response (Error - Already Processed):**
```json
{
  "success": true,
  "message": "Payment already verified. Enrollment exists.",
  "enrollment": { ... },
  "alreadyProcessed": true
}
```

**Error Codes:**
- `400` - Missing required fields
- `400` - Signature mismatch
- `403` - Student mismatch
- `403` - Course mismatch
- `404` - Payment record not found
- `404` - Course not found
- `500` - Enrollment creation failed

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/payment/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "razorpayOrderId": "order_1234567890",
    "razorpayPaymentId": "pay_1234567890",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
    "courseId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 3. GET PAYMENT HISTORY

**Endpoint:** `GET /payment/history`

**Authentication:** Required (JWT Token)

**Purpose:** Fetches payment history for the logged-in student.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Response (Success):**
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment-uuid",
      "student_id": "student-uuid",
      "course_id": "course-uuid",
      "razorpay_order_id": "order_1234567890",
      "razorpay_payment_id": "pay_1234567890",
      "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
      "amount": 499,
      "currency": "INR",
      "payment_status": "completed",
      "payment_method": "card",
      "created_at": "2024-05-28T10:30:00Z",
      "verified_at": "2024-05-28T10:31:00Z",
      "course": {
        "id": "course-uuid",
        "title": "Advanced React",
        "price": 499
      }
    }
  ]
}
```

**Example cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/payment/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. RAZORPAY WEBHOOK (Optional)

**Endpoint:** `POST /payment/webhook`

**Authentication:** Not required (Razorpay signature verification)

**Purpose:** Handles Razorpay webhook events for additional security.

**Request Headers:**
```
x-razorpay-signature: webhook_signature
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "order_id": "order_1234567890",
        "payment_id": "pay_1234567890"
      }
    }
  }
}
```

**Response:**
```json
{
  "received": true
}
```

---

## 📋 ENROLLMENT ENDPOINTS

### 1. ENROLL IN FREE COURSE

**Endpoint:** `POST /enrollment/free`

**Authentication:** Required (JWT Token)

**Purpose:** Enrolls student in a free course. No payment verification needed.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully enrolled in free course",
  "enrollment": {
    "id": "enrollment-uuid",
    "student_id": "student-uuid",
    "course_id": "course-uuid",
    "enrollment_type": "free",
    "payment_status": "not_required",
    "amount_paid": 0,
    "active": true,
    "enrolled_at": "2024-05-28T10:30:00Z"
  }
}
```

**Response (Already Enrolled):**
```json
{
  "success": true,
  "message": "Already enrolled in this course",
  "alreadyEnrolled": true
}
```

**Error Codes:**
- `400` - Missing courseId
- `400` - This is a paid course
- `404` - Course not found
- `500` - Enrollment failed

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/enrollment/free \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## 📋 COURSE ACCESS ENDPOINTS

### 1. GET LEARNING PAGE (SECURE)

**Endpoint:** `GET /courses/learn/:courseId`

**Authentication:** Required (JWT Token)

**Middleware:** `verifyEnrollmentSecure` - Verifies enrollment before returning content

**Purpose:** Returns course content ONLY if student has access.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Response (Success - Free Course):**
```json
{
  "success": true,
  "course": {
    "id": "course-uuid",
    "title": "Free React Course",
    "description": "Learn React basics",
    "is_free": true,
    "price": 0,
    "sections": [
      {
        "id": "section-uuid",
        "title": "Introduction",
        "sub_sections": [
          {
            "id": "lesson-uuid",
            "title": "What is React?",
            "youtube_video_id": "dQw4w9WgXcQ",
            "duration_seconds": 600
          }
        ]
      }
    ]
  },
  "enrollment": {
    "id": "enrollment-uuid",
    "enrollment_type": "free",
    "payment_status": "not_required"
  }
}
```

**Response (Success - Paid Course with Payment):**
```json
{
  "success": true,
  "course": { ... },
  "enrollment": {
    "id": "enrollment-uuid",
    "enrollment_type": "paid",
    "payment_status": "completed",
    "amount_paid": 499
  }
}
```

**Response (Error - Not Enrolled):**
```json
{
  "success": false,
  "message": "You are not enrolled in this course. Please purchase to access.",
  "error": "NOT_ENROLLED"
}
```

**Response (Error - Payment Not Verified):**
```json
{
  "success": false,
  "message": "Payment not verified. Please complete payment to access this course.",
  "error": "PAYMENT_NOT_VERIFIED",
  "paymentStatus": "pending"
}
```

**Error Codes:**
- `403` - Not enrolled
- `403` - Payment not verified
- `404` - Course not found
- `500` - Server error

**Example cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/courses/learn/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔐 SECURITY FEATURES

### Signature Verification

All payment verification uses HMAC-SHA256:

```javascript
// Backend verification
const signatureBody = `${razorpayOrderId}|${razorpayPaymentId}`;
const expectedSignature = crypto
  .createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(signatureBody)
  .digest("hex");

if (expectedSignature !== razorpaySignature) {
  throw new Error("Signature mismatch");
}
```

### JWT Token Validation

Every endpoint validates JWT token:

```javascript
// Token extracted from Authorization header
const token = req.headers.authorization?.substring(7);

// Verified with Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);
```

### Enrollment Verification

Learning page verifies enrollment:

```javascript
// For paid courses, must have completed payment
if (enrollment.enrollment_type === "paid" && enrollment.payment_status !== "completed") {
  return res.status(403).json({ error: "PAYMENT_NOT_VERIFIED" });
}
```

---

## 📊 RESPONSE CODES

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (access denied) |
| 404 | Not found (course/payment not found) |
| 500 | Server error |

---

## 🧪 TESTING WITH POSTMAN

### 1. Create Order
```
POST http://localhost:5000/api/v1/payment/create-order
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "courseId": "course-uuid",
  "amount": 499
}
```

### 2. Verify Payment
```
POST http://localhost:5000/api/v1/payment/verify
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "razorpayOrderId": "order_id_from_step_1",
  "razorpayPaymentId": "pay_1234567890",
  "razorpaySignature": "signature_from_razorpay",
  "courseId": "course-uuid"
}
```

### 3. Get Learning Page
```
GET http://localhost:5000/api/v1/courses/learn/course-uuid
Headers:
  Authorization: Bearer YOUR_TOKEN
```

---

## 🚀 FRONTEND INTEGRATION

### Using usePaymentSecure Hook

```javascript
import { usePaymentSecure } from "../hooks/usePaymentSecure";

function MyComponent() {
  const { createOrder, verifyPayment, enrollFree } = usePaymentSecure();
  const { token } = useSelector(state => state.auth);

  // Create order
  const handleCreateOrder = async () => {
    const result = await createOrder({
      courseId: "course-uuid",
      amount: 499,
      token
    });
    // result.orderId, result.amount, etc.
  };

  // Verify payment
  const handleVerifyPayment = async () => {
    const result = await verifyPayment({
      razorpayOrderId: "order_id",
      razorpayPaymentId: "pay_id",
      razorpaySignature: "signature",
      courseId: "course-uuid",
      token
    });
    // result.enrollment
  };

  // Enroll in free course
  const handleEnrollFree = async () => {
    const result = await enrollFree({
      courseId: "course-uuid",
      token
    });
    // result.enrollment
  };
}
```

---

## 📝 NOTES

- All amounts are in INR (Indian Rupees)
- Razorpay converts INR to paise (multiply by 100)
- Signatures are verified using HMAC-SHA256
- Enrollments are unique per student per course
- Payment status must be "completed" for paid course access
- Free courses have payment_status = "not_required"

---

## ✅ PRODUCTION CHECKLIST

- [ ] All endpoints tested
- [ ] Error handling verified
- [ ] Signature verification working
- [ ] Database queries optimized
- [ ] RLS policies enabled
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
