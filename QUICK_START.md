# ⚡ QUICK START - 5 MINUTE SETUP

## 🎯 Goal
Implement secure payment system in your LMS in ~55 minutes.

---

## 📋 BEFORE YOU START

✅ Have Node.js installed
✅ Have Supabase account
✅ Have Razorpay account (test mode)
✅ Have your LMS running locally

---

## 🚀 STEP 1: DATABASE (5 minutes)

### 1.1 Open Supabase Dashboard
```
https://app.supabase.com → Your Project → SQL Editor
```

### 1.2 Create New Query
Click "New Query"

### 1.3 Copy SQL
Open `SECURITY_FIX_SCHEMA.sql` and copy ALL content

### 1.4 Paste & Run
Paste into SQL editor and click "Run"

### 1.5 Verify
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('enrollments', 'payments');
```

✅ **Database done!**

---

## 🔧 STEP 2: BACKEND (15 minutes)

### 2.1 Copy Files
```bash
# Copy controller
cp PaymentSecure.js backend/controllers/

# Copy middleware
cp verifyEnrollmentSecure.js backend/middleware/

# Copy routes
cp paymentSecureRoutes.js backend/routes/
```

### 2.2 Update server.js
```javascript
// Add at top with other requires
const paymentSecureRoutes = require("./routes/paymentSecureRoutes");

// Add with other route registrations
app.use("/api/v1/payment", paymentSecureRoutes);
app.use("/api/v1/enrollment", paymentSecureRoutes);
```

### 2.3 Update Course Routes
```javascript
// In routes/courseRoutes.js
const { verifyEnrollmentSecure } = require("../middleware/verifyEnrollmentSecure");

// Update learning page route
router.get(
    "/learn/:courseId",
    auth,
    isStudent,
    verifyEnrollmentSecure,
    courseController.getLearningPage
);
```

### 2.4 Set Environment Variables
```env
# .env file
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 2.5 Test Backend
```bash
# Start backend
npm start

# In another terminal, test endpoint
curl -X POST http://localhost:5000/api/v1/payment/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"course-id","amount":499}'
```

✅ **Backend done!**

---

## 🎨 STEP 3: FRONTEND (15 minutes)

### 3.1 Copy Files
```bash
# Copy hook
cp usePaymentSecure.js frontend/src/hooks/

# Copy components
cp PaymentModalSecure.jsx frontend/src/components/
cp EnrollmentButtonSecure.jsx frontend/src/components/

# Copy page
cp CourseLearningPageSecure.jsx frontend/src/pages/
```

### 3.2 Update Routes
```javascript
// In src/App.jsx or src/routes/index.jsx

import EnrollmentButtonSecure from "../components/EnrollmentButtonSecure";
import CourseLearningPageSecure from "../pages/CourseLearningPageSecure";

// Update route
<Route path="/learn/:courseId" element={<CourseLearningPageSecure />} />

// In course detail page, replace old button:
<EnrollmentButtonSecure 
  course={course}
  onEnrolled={() => console.log("Enrolled!")}
/>
```

### 3.3 Set Environment Variables
```env
# .env file
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_RAZORPAY_KEY_ID=rzp_test_SuXSEK8nNcHwKe
```

### 3.4 Verify Razorpay Script
```html
<!-- In public/index.html -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 3.5 Start Frontend
```bash
npm start
```

✅ **Frontend done!**

---

## 🧪 STEP 4: TESTING (20 minutes)

### Test 1: Free Course (2 min)
```
1. Go to free course
2. Click "Start Learning Free"
3. Verify enrollment created
4. Verify redirected to /learn/:courseId
5. Verify course loads
```

### Test 2: Paid Course (10 min)
```
1. Go to paid course
2. Click "Buy Now"
3. Modal opens
4. Click "Pay Now"
5. Razorpay opens
6. Use test card: 4111 1111 1111 1111
7. Any expiry date (future)
8. Any CVV
9. Complete payment
10. Verify enrollment created
11. Verify redirected to course
12. Verify course loads
```

### Test 3: Access Control (3 min)
```
1. Try to access /learn/:courseId without enrollment
2. Verify 403 error
3. Verify redirected to course details
```

### Test 4: Database (5 min)
```sql
-- Check enrollment
SELECT * FROM public.enrollments 
WHERE student_id = 'your-id' 
ORDER BY enrolled_at DESC;

-- Check payment
SELECT * FROM public.payments 
WHERE student_id = 'your-id' 
ORDER BY created_at DESC;
```

✅ **All tests pass!**

---

## ✅ VERIFICATION CHECKLIST

### Database
- [ ] Tables created
- [ ] Columns added
- [ ] Indexes created
- [ ] RLS enabled

### Backend
- [ ] Files copied
- [ ] Routes registered
- [ ] Environment variables set
- [ ] Endpoints working

### Frontend
- [ ] Files copied
- [ ] Routes updated
- [ ] Environment variables set
- [ ] Razorpay script loaded

### Testing
- [ ] Free course works
- [ ] Paid course works
- [ ] Access control works
- [ ] Database updated

---

## 🎉 YOU'RE DONE!

Your LMS now has a **secure payment system**! 🔒

### What's Secured:
✅ Free courses accessible instantly
✅ Paid courses require payment
✅ Payment verified on backend
✅ Enrollment created after verification
✅ Access control enforced
✅ Duplicate enrollments prevented

### Next Steps:
1. Review `SECURITY_FIX_INTEGRATION_GUIDE.md` for details
2. Review `API_ENDPOINTS_SECURE.md` for API docs
3. Monitor payment success rate
4. Set up error logging
5. Deploy to production

---

## 🆘 QUICK TROUBLESHOOTING

### Razorpay popup not opening
```
1. Check Razorpay script in index.html
2. Check REACT_APP_RAZORPAY_KEY_ID in .env
3. Check browser console for errors
```

### Payment verification fails
```
1. Check RAZORPAY_KEY_SECRET in backend .env
2. Check backend logs
3. Verify order ID matches
```

### Enrollment not created
```
1. Check backend logs
2. Check database connection
3. Verify RLS policies not blocking
```

### Access denied to course
```
1. Check enrollment exists in database
2. Check payment_status = "completed"
3. Check middleware logs
```

---

## 📞 NEED HELP?

1. Check `SECURITY_FIX_INTEGRATION_GUIDE.md`
2. Check `IMPLEMENTATION_CHECKLIST.md`
3. Check `API_ENDPOINTS_SECURE.md`
4. Review backend logs
5. Check browser console

---

## 🔐 SECURITY SUMMARY

Your system now:
- ✅ Verifies payments with HMAC-SHA256
- ✅ Creates enrollments after verification
- ✅ Prevents unauthorized access
- ✅ Prevents duplicate enrollments
- ✅ Maintains audit trail
- ✅ Implements RLS policies
- ✅ Follows industry best practices

**Your LMS is now production-ready! 🚀**
