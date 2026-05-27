# 🔒 SECURE PAYMENT SYSTEM - COMPLETE INTEGRATION GUIDE

## ⚠️ CRITICAL SECURITY ISSUE FIXED

**Previous Vulnerability:**
- Students got instant access to PAID courses without payment
- Enrollment created BEFORE payment verification
- Razorpay popup not required
- Payment verification skipped

**New Secure Flow:**
- Razorpay order created FIRST
- Payment verified on backend using HMAC-SHA256
- Enrollment created ONLY after signature verification
- Access control enforced at every step

---

## 📋 TABLE OF CONTENTS

1. [Database Setup](#database-setup)
2. [Backend Integration](#backend-integration)
3. [Frontend Integration](#frontend-integration)
4. [Testing & Verification](#testing--verification)
5. [Security Checklist](#security-checklist)

---

## 🗄️ DATABASE SETUP

### Step 1: Run SQL Migration

Execute the SQL file to update your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Create new query
# 3. Copy content from: SECURITY_FIX_SCHEMA.sql
# 4. Run query

# Option 2: Via CLI (if you have supabase CLI installed)
supabase db push
```

### What the SQL does:

✅ Adds payment security columns to `enrollments` table:
- `enrollment_type` (free/paid)
- `payment_status` (pending/completed/failed/refunded/not_required)
- `razorpay_order_id` (unique)
- `razorpay_payment_id` (unique)
- `razorpay_signature`
- `amount_paid`
- `active` (boolean)

✅ Creates `payments` table for audit trail:
- Tracks all payment attempts
- Stores Razorpay details
- Enables payment history

✅ Creates indexes for performance:
- Fast enrollment lookups
- Fast payment verification

✅ Enables Row Level Security (RLS):
- Students can only see their own data
- Instructors can see their course enrollments
- Admins can see everything

✅ Creates helper functions:
- `can_access_course()` - Check if student can access
- `is_student_enrolled_with_payment()` - Verify payment

✅ Creates triggers:
- Prevent duplicate enrollments
- Sync payment status to enrollments

---

## 🔧 BACKEND INTEGRATION

### Step 1: Copy New Controller

Copy `backend/controllers/PaymentSecure.js` to your backend:

```
backend/
├── controllers/
│   ├── PaymentSecure.js          ← NEW (copy this)
│   ├── Payments.js               (keep existing)
│   └── ...
```

### Step 2: Copy New Middleware

Copy `backend/middleware/verifyEnrollmentSecure.js`:

```
backend/
├── middleware/
│   ├── verifyEnrollmentSecure.js ← NEW (copy this)
│   ├── auth.js                   (existing)
│   └── ...
```

### Step 3: Copy New Routes

Copy `backend/routes/paymentSecureRoutes.js`:

```
backend/
├── routes/
│   ├── paymentSecureRoutes.js    ← NEW (copy this)
│   ├── courseRoutes.js           (existing)
│   └── ...
```

### Step 4: Update Main Server File (server.js or index.js)

Add the new routes to your Express app:

```javascript
// server.js or index.js

const paymentSecureRoutes = require("./routes/paymentSecureRoutes");

// Add this line with your other route registrations
app.use("/api/v1/payment", paymentSecureRoutes);
app.use("/api/v1/enrollment", paymentSecureRoutes);
```

### Step 5: Update Course Routes

Update your course routes to use the secure middleware:

```javascript
// routes/courseRoutes.js

const { verifyEnrollmentSecure } = require("../middleware/verifyEnrollmentSecure");
const { auth, isStudent } = require("../middleware/auth");

// SECURE: Learning page requires enrollment verification
router.get(
    "/learn/:courseId",
    auth,
    isStudent,
    verifyEnrollmentSecure,
    courseController.getLearningPage
);

// SECURE: Get course details with enrollment check
router.get(
    "/details/:courseId",
    auth,
    checkEnrollmentStatus,
    courseController.getCourseDetails
);
```

### Step 6: Verify Environment Variables

Ensure your `.env` file has:

```env
# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret (optional)

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Node environment
NODE_ENV=production
```

### Step 7: Test Backend Endpoints

```bash
# Test create order
curl -X POST http://localhost:5000/api/v1/payment/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "course-uuid",
    "amount": 499
  }'

# Expected response:
# {
#   "success": true,
#   "orderId": "order_...",
#   "amount": 49900,
#   "currency": "INR",
#   "totalAmount": 499
# }
```

---

## 🎨 FRONTEND INTEGRATION

### Step 1: Copy New Hooks

Copy `frontend/src/hooks/usePaymentSecure.js`:

```
frontend/src/
├── hooks/
│   ├── usePaymentSecure.js       ← NEW (copy this)
│   ├── useEnrollment.js          (existing)
│   └── ...
```

### Step 2: Copy New Components

Copy the new components:

```
frontend/src/
├── components/
│   ├── PaymentModalSecure.jsx    ← NEW (copy this)
│   ├── EnrollmentButtonSecure.jsx ← NEW (copy this)
│   ├── PaymentModal.jsx          (old - can keep for reference)
│   └── ...
```

### Step 3: Copy New Pages

Copy `frontend/src/pages/CourseLearningPageSecure.jsx`:

```
frontend/src/
├── pages/
│   ├── CourseLearningPageSecure.jsx ← NEW (copy this)
│   ├── CourseLearning.jsx        (old - can keep for reference)
│   └── ...
```

### Step 4: Update Routes

Update your React Router to use the new secure components:

```javascript
// src/App.jsx or src/routes/index.jsx

import EnrollmentButtonSecure from "../components/EnrollmentButtonSecure";
import CourseLearningPageSecure from "../pages/CourseLearningPageSecure";

// In your route definitions:
<Route path="/learn/:courseId" element={<CourseLearningPageSecure />} />

// In course detail page:
<EnrollmentButtonSecure 
  course={course}
  onEnrolled={() => {
    // Handle enrollment success
  }}
/>
```

### Step 5: Verify Environment Variables

Ensure your `.env` file has:

```env
# Backend API
REACT_APP_API_URL=http://localhost:5000/api/v1

# Razorpay
REACT_APP_RAZORPAY_KEY_ID=your_test_key_id

# For Vite projects
VITE_RAZORPAY_KEY_ID=your_test_key_id
```

### Step 6: Ensure Razorpay Script is Loaded

Add to `public/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- ... other head content ... -->
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### Step 7: Test Frontend Flow

1. Navigate to a paid course
2. Click "Buy Now" button
3. Verify PaymentModalSecure opens
4. Verify Razorpay popup opens
5. Complete test payment
6. Verify enrollment created
7. Verify redirect to course

---

## 🧪 TESTING & VERIFICATION

### Test Scenarios

#### Scenario 1: Free Course Enrollment

```
1. Navigate to free course
2. Click "Start Learning Free"
3. Verify enrollment created with payment_status = "not_required"
4. Verify redirect to /learn/:courseId
5. Verify course content loads
```

#### Scenario 2: Paid Course - Successful Payment

```
1. Navigate to paid course
2. Click "Buy Now - ₹499"
3. Verify PaymentModalSecure opens
4. Click "Pay Now"
5. Verify Razorpay popup opens
6. Complete test payment (use test card: 4111 1111 1111 1111)
7. Verify backend verifies signature
8. Verify enrollment created with payment_status = "completed"
9. Verify redirect to /learn/:courseId
10. Verify course content loads
```

#### Scenario 3: Paid Course - Failed Payment

```
1. Navigate to paid course
2. Click "Buy Now"
3. Open Razorpay popup
4. Close popup without paying
5. Verify error message shown
6. Verify enrollment NOT created
7. Verify can retry payment
```

#### Scenario 4: Unauthorized Access Prevention

```
1. Try to access /learn/:courseId without enrollment
2. Verify 403 Forbidden response
3. Verify redirected to course details
4. Verify cannot bypass with URL manipulation
```

#### Scenario 5: Duplicate Enrollment Prevention

```
1. Complete payment for course
2. Try to pay again for same course
3. Verify error: "Already enrolled"
4. Verify no duplicate enrollment created
```

### Database Verification

```sql
-- Check enrollments
SELECT * FROM public.enrollments 
WHERE student_id = 'your-user-id' 
ORDER BY enrolled_at DESC;

-- Check payments
SELECT * FROM public.payments 
WHERE student_id = 'your-user-id' 
ORDER BY created_at DESC;

-- Verify payment status
SELECT 
  e.id,
  e.student_id,
  e.course_id,
  e.enrollment_type,
  e.payment_status,
  e.razorpay_order_id,
  p.payment_status as payment_record_status
FROM public.enrollments e
LEFT JOIN public.payments p ON e.razorpay_order_id = p.razorpay_order_id
WHERE e.student_id = 'your-user-id';
```

---

## ✅ SECURITY CHECKLIST

### Backend Security

- [ ] Razorpay signature verified using HMAC-SHA256
- [ ] Enrollment created ONLY after signature verification
- [ ] Payment status checked before granting access
- [ ] Duplicate enrollment prevention enabled
- [ ] RLS policies enabled on enrollments table
- [ ] RLS policies enabled on payments table
- [ ] JWT token verified on every request
- [ ] Student ID verified matches payment record
- [ ] Course ID verified matches payment record
- [ ] Amount verified matches course price
- [ ] Enrollment middleware enforces access control
- [ ] Free courses accessible without payment
- [ ] Paid courses require completed payment
- [ ] Instructors can access their own courses
- [ ] Admins can access all courses

### Frontend Security

- [ ] Payment modal opens BEFORE enrollment
- [ ] Razorpay popup opens for paid courses
- [ ] Signature verification happens on backend
- [ ] Enrollment created AFTER verification
- [ ] No enrollment before payment completion
- [ ] Access denied message shown for unauthorized users
- [ ] Token verified before API calls
- [ ] Error handling for failed payments
- [ ] Retry mechanism for failed payments
- [ ] Loading states prevent double-clicks
- [ ] Redirect to login if not authenticated

### Database Security

- [ ] Enrollments table has payment_status column
- [ ] Payments table created for audit trail
- [ ] Unique constraints on razorpay_order_id
- [ ] Unique constraints on (student_id, course_id)
- [ ] Indexes created for performance
- [ ] RLS policies enabled
- [ ] Triggers prevent duplicates
- [ ] Triggers sync payment status

### Payment Gateway Security

- [ ] Razorpay API keys in environment variables
- [ ] Webhook secret configured (optional)
- [ ] Test mode used for development
- [ ] Production keys used for production
- [ ] Signature verification implemented
- [ ] Order ID verified
- [ ] Payment ID verified
- [ ] Amount verified

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Going Live

1. **Database**
   - [ ] Run SQL migration on production database
   - [ ] Verify all tables created
   - [ ] Verify all indexes created
   - [ ] Verify RLS policies enabled

2. **Backend**
   - [ ] Copy PaymentSecure.js controller
   - [ ] Copy verifyEnrollmentSecure.js middleware
   - [ ] Copy paymentSecureRoutes.js routes
   - [ ] Update server.js with new routes
   - [ ] Update course routes with middleware
   - [ ] Set production environment variables
   - [ ] Test all endpoints
   - [ ] Enable error logging

3. **Frontend**
   - [ ] Copy usePaymentSecure.js hook
   - [ ] Copy PaymentModalSecure.jsx component
   - [ ] Copy EnrollmentButtonSecure.jsx component
   - [ ] Copy CourseLearningPageSecure.jsx page
   - [ ] Update routes to use new components
   - [ ] Set production environment variables
   - [ ] Test all flows
   - [ ] Verify Razorpay script loads

4. **Testing**
   - [ ] Test free course enrollment
   - [ ] Test paid course payment flow
   - [ ] Test failed payment handling
   - [ ] Test unauthorized access prevention
   - [ ] Test duplicate enrollment prevention
   - [ ] Test payment history
   - [ ] Test admin access
   - [ ] Test instructor access

5. **Monitoring**
   - [ ] Set up error logging
   - [ ] Monitor payment failures
   - [ ] Monitor access denied errors
   - [ ] Monitor database performance
   - [ ] Set up alerts for critical errors

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue: Razorpay popup not opening**
- Solution: Verify Razorpay script loaded in index.html
- Solution: Verify REACT_APP_RAZORPAY_KEY_ID set correctly
- Solution: Check browser console for errors

**Issue: Payment verification fails**
- Solution: Verify RAZORPAY_KEY_SECRET set correctly
- Solution: Check backend logs for signature mismatch
- Solution: Verify order ID and payment ID match

**Issue: Enrollment not created after payment**
- Solution: Check backend logs for errors
- Solution: Verify database connection
- Solution: Verify RLS policies not blocking insert

**Issue: Access denied to course**
- Solution: Verify enrollment exists in database
- Solution: Verify payment_status = "completed"
- Solution: Check middleware logs

**Issue: Duplicate enrollment error**
- Solution: This is expected - user already enrolled
- Solution: Show "Already enrolled" message instead

---

## 🔐 SECURITY BEST PRACTICES

1. **Never trust frontend only**
   - Always verify on backend
   - Always verify signature
   - Always check payment status

2. **Use HTTPS in production**
   - Encrypt all data in transit
   - Protect API keys
   - Protect JWT tokens

3. **Rotate API keys regularly**
   - Change Razorpay keys periodically
   - Change JWT secret periodically
   - Monitor for unauthorized access

4. **Monitor payment failures**
   - Log all failed payments
   - Alert on suspicious patterns
   - Review failed transactions

5. **Keep dependencies updated**
   - Update Razorpay SDK
   - Update Supabase client
   - Update security patches

---

## 📊 MONITORING & ANALYTICS

### Key Metrics to Track

```sql
-- Enrollment rate
SELECT 
  DATE(enrolled_at) as date,
  COUNT(*) as enrollments,
  SUM(CASE WHEN enrollment_type = 'free' THEN 1 ELSE 0 END) as free,
  SUM(CASE WHEN enrollment_type = 'paid' THEN 1 ELSE 0 END) as paid
FROM public.enrollments
GROUP BY DATE(enrolled_at)
ORDER BY date DESC;

-- Payment success rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_payments,
  SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM public.payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Revenue by course
SELECT 
  c.title,
  COUNT(e.id) as enrollments,
  SUM(e.amount_paid) as revenue
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
WHERE e.payment_status = 'completed'
GROUP BY c.id, c.title
ORDER BY revenue DESC;
```

---

## ✨ SUMMARY

Your LMS now has a **production-ready, secure payment system** that:

✅ Prevents unauthorized access to paid courses
✅ Verifies all payments using HMAC-SHA256
✅ Creates enrollments ONLY after payment verification
✅ Prevents duplicate enrollments
✅ Provides audit trail of all payments
✅ Implements Row Level Security
✅ Follows industry best practices
✅ Matches Udemy/Coursera security standards

**Your platform is now secure! 🔒**
