-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURE PAYMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ALTER ENROLLMENTS TABLE - ADD PAYMENT SECURITY COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'free' CHECK (enrollment_type IN ('free', 'paid'));

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'not_required'));

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT UNIQUE;

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT UNIQUE;

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE PAYMENTS TABLE - AUDIT TRAIL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREATE INDEXES FOR PERFORMANCE & SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Enrollment access checks
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course 
ON public.enrollments(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_payment_status 
ON public.enrollments(student_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_payment_status 
ON public.enrollments(course_id, payment_status);

-- Payment verification
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id 
ON public.payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id 
ON public.payments(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_student_course 
ON public.payments(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_payments_status 
ON public.payments(payment_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENABLE ROW LEVEL SECURITY (RLS) - CRITICAL FOR SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES FOR ENROLLMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Students can only view their own enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
CREATE POLICY "Students can view own enrollments" ON public.enrollments
    FOR SELECT
    USING (auth.uid() = student_id);

-- Instructors can view enrollments in their courses
DROP POLICY IF EXISTS "Instructors can view course enrollments" ON public.enrollments;
CREATE POLICY "Instructors can view course enrollments" ON public.enrollments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Admins can view all enrollments
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'Admin'
        )
    );

-- Only backend can insert enrollments (via service role)
DROP POLICY IF EXISTS "Backend can insert enrollments" ON public.enrollments;
CREATE POLICY "Backend can insert enrollments" ON public.enrollments
    FOR INSERT
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS POLICIES FOR PAYMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Students can only view their own payments
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
CREATE POLICY "Students can view own payments" ON public.payments
    FOR SELECT
    USING (auth.uid() = student_id);

-- Instructors can view payments for their courses
DROP POLICY IF EXISTS "Instructors can view course payments" ON public.payments;
CREATE POLICY "Instructors can view course payments" ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = payments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Admins can view all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'Admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTIONS FOR SECURE ACCESS CHECKS
-- ─────────────────────────────────────────────────────────────────────────────

-- Check if student can access course
CREATE OR REPLACE FUNCTION public.can_access_course(
    p_student_id UUID,
    p_course_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_free BOOLEAN;
    v_is_enrolled BOOLEAN;
    v_payment_status TEXT;
BEGIN
    -- Check if course is free
    SELECT is_free INTO v_is_free FROM public.courses WHERE id = p_course_id;
    
    IF v_is_free THEN
        RETURN TRUE;
    END IF;
    
    -- Check if student has completed payment
    SELECT payment_status INTO v_payment_status 
    FROM public.enrollments 
    WHERE student_id = p_student_id 
    AND course_id = p_course_id 
    AND active = TRUE;
    
    RETURN v_payment_status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if student is enrolled with valid payment
CREATE OR REPLACE FUNCTION public.is_student_enrolled_with_payment(
    p_student_id UUID,
    p_course_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE student_id = p_student_id 
        AND course_id = p_course_id 
        AND active = TRUE
        AND (
            enrollment_type = 'free' 
            OR (enrollment_type = 'paid' AND payment_status = 'completed')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TRIGGER TO PREVENT DUPLICATE ENROLLMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_duplicate_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if active enrollment already exists
    IF EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE student_id = NEW.student_id 
        AND course_id = NEW.course_id 
        AND active = TRUE
    ) THEN
        RAISE EXCEPTION 'Student is already enrolled in this course';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_enrollment_trigger ON public.enrollments;
CREATE TRIGGER prevent_duplicate_enrollment_trigger
BEFORE INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_enrollment();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TRIGGER TO SYNC PAYMENT STATUS TO ENROLLMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_payment_to_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    -- When payment is verified, update enrollment
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        UPDATE public.enrollments 
        SET payment_status = 'completed',
            amount_paid = NEW.amount,
            updated_at = NOW()
        WHERE razorpay_order_id = NEW.razorpay_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_payment_to_enrollment_trigger ON public.payments;
CREATE TRIGGER sync_payment_to_enrollment_trigger
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_to_enrollment();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. VERIFY EXISTING CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure unique enrollment per student per course
ALTER TABLE public.enrollments 
DROP CONSTRAINT IF EXISTS enrollments_student_course_unique;

ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_student_course_unique 
UNIQUE(student_id, course_id);

-- Ensure payment records are unique by order ID
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_razorpay_order_unique;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_razorpay_order_unique 
UNIQUE(razorpay_order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_course TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student_enrolled_with_payment TO authenticated;

COMMIT;
