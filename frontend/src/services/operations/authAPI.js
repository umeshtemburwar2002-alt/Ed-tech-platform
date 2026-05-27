import { toast } from "react-hot-toast";
import { setLoading, setToken } from "../../slices/authSlice";
import { resetCart } from "../../slices/cartSlice";
import { setUser } from "../../slices/profileSlice";
import { supabase } from "../../config/supabaseClient";
import {
  buildAppUserFromSession,
  defaultAvatar,
  persistClientSession,
  clearClientSessionStores,
} from "../../utils/supabaseAuthHelpers";

/** Register with Supabase Auth + `profiles` row. Email confirmation follows Supabase project settings. */
export function registerWithSupabase(navigate) {
  return async (dispatch, getState) => {
    const toastId = toast.loading("Creating account...");
    dispatch(setLoading(true));
    try {
      const signupData = getState().auth.signupData;
      if (!signupData?.email || !signupData?.password) {
        toast.error("Missing signup info. Please fill the form again.");
        navigate("/signup");
        return;
      }

      const { firstName, lastName, email, password } = signupData;

      let accountType = signupData.accountType || signupData.role || "Student";
      accountType = accountType.toLowerCase();
      if (accountType === "teacher" || accountType === "instructor") accountType = "Instructor";
      else if (accountType === "admin") accountType = "Admin";
      else accountType = "Student";

      console.log("[registerWithSupabase] Selected role (lowercase):", accountType);

      // Compose full_name — this is what the greeting will show
      const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            firstName,
            lastName,
            full_name:   fullName,      // ← critical: stored in raw_user_meta_data
            accountType,
          },
        },
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id:             userId,
            first_name:     firstName?.trim() || "",
            last_name:      lastName?.trim()  || "",
            full_name:      fullName,           // ← critical: stored in profiles table
            email,
            account_type:   accountType,
            role:           accountType,
            contact_number: signupData.contactNumber ?? "",
            image:          defaultAvatar(firstName, lastName),
            avatar_url:     defaultAvatar(firstName, lastName),
          },
          { onConflict: "id" }
        );

        if (profileError) {
          console.error("profiles upsert:", profileError);
          toast.error(
            profileError.message ||
              "Account created but profile save failed — check Supabase RLS/policies for `profiles`.",
            { duration: 6000 }
          );
        }
      }

      toast.success(
        data.session
          ? "Signup successful!"
          : "Check your email to confirm your account, then log in.",
        { duration: 5000 }
      );
      navigate("/verify-email");
    } catch (error) {
      console.error("registerWithSupabase", error);
      toast.error(error.message || "Signup failed");
    } finally {
      dispatch(setLoading(false));
      toast.dismiss(toastId);
    }
  };
}


/** Resend Supabase signup / confirmation email. */
export function resendSignupConfirmation(email) {
  return async (dispatch) => {
    if (!email) {
      toast.error("No email to resend to");
      return;
    }
    dispatch(setLoading(true));
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      toast.success("Confirmation email resent");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Could not resend email");
    }
    dispatch(setLoading(false));
  };
}

export function login(email, password, navigate, selectedRole = null, customRedirect = null) {
  return async (dispatch) => {
    const toastId = toast.loading("Signing in...");
    dispatch(setLoading(true));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        toast.error(
          "Confirm your email from the inbox link before signing in.",
          { duration: 6000 }
        );
        return;
      }

      // Fetch existing profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If it's a new user (no profile) and a role was selected, save it
      if (!profile && selectedRole) {
        const normalizedRole = selectedRole.toLowerCase();
        await supabase.from("profiles").upsert(
          {
            id:           data.user.id,
            email:        data.user.email ?? "",
            account_type: normalizedRole,
            role:         normalizedRole,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      // Re-fetch profile after potential upsert
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      const appUser = buildAppUserFromSession(data.session, freshProfile ?? profile);
      if (!appUser) {
        toast.error("Could not load user profile.");
        return;
      }

      dispatch(setToken(accessToken));
      dispatch(setUser(appUser));
      persistClientSession(accessToken, appUser);
      toast.success("Login successful");

      if (customRedirect) {
        navigate(customRedirect);
      } else if (appUser.accountType?.toLowerCase() === "admin") {
        navigate("/admin/dashboard");
      } else if (appUser.accountType?.toLowerCase() === "instructor") {
        navigate("/instructor/setup");
      } else {
        navigate("/dashboard/my-profile");
      }
    } catch (error) {
      console.error("login", error);
      toast.error(error.message || "Login failed");
    } finally {
      dispatch(setLoading(false));
      toast.dismiss(toastId);
    }
  };
}

export function logout(navigate) {
  return async (dispatch) => {
    dispatch(resetCart());
    const { performLogout } = await import("../syncSupabaseSession");
    await performLogout(dispatch, navigate);
  };
}


export function sendPasswordRecoveryEmail(email) {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast.success("If this email is registered, a reset link was sent.");
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Could not send reset email");
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };
}
