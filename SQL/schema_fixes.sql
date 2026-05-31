-- ================================================================
-- FIX 1: Create missing `payments` table
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id           UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  razorpay_order_id   TEXT        NOT NULL UNIQUE,
  razorpay_payment_id TEXT                 DEFAULT NULL,
  razorpay_signature  TEXT                 DEFAULT NULL,
  amount              NUMERIC(10,2)        NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'INR',
  payment_status      TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending', 'completed', 'failed', 'success')),
  notes               JSONB                DEFAULT '{}',
  verified_at         TIMESTAMPTZ          DEFAULT NULL,
  created_at          TIMESTAMPTZ          DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- RLS POLICIES FOR payments
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "payments_student_own" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all"   ON public.payments;

-- Students can read their own payments
CREATE POLICY "payments_student_own"
  ON public.payments FOR SELECT
  USING (auth.uid() = student_id);

-- Admins get full access
CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(razorpay_order_id);

-- Apply auto-update timestamp trigger if the function exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ================================================================
-- DONE ✅
-- ================================================================
