import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDraftPayload,
  loadDraftForInstructor,
  saveInstructorDraft,
} from "../services/courseDraftService";

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 2500;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useCourseDraftAutosave({ instructorId, data, step, setData, setStep }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [draftMeta, setDraftMeta] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const latestPayloadRef = useRef(null);
  const lastSavedSnapshotRef = useRef("");
  const saveTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const payload = useMemo(() => buildDraftPayload(data, step), [data, step]);

  const isNonRetryableSaveError = (err) => {
    const code = err?.code;
    if (!code) return false;
    return ["PGRST202", "42883", "42P01", "42501"].includes(code);
  };

  const humanizeSaveError = (err) => {
    if (!err) return "Draft save failed";
    const code = err.code;
    if (code === "22P02") {
      return "Database type mismatch detected for draft autosave. Please run docs/sql/course_drafts_autosave_v2.sql again.";
    }
    if (code === "PGRST202" || code === "42883") {
      return "Autosave DB function is missing. Run docs/sql/course_drafts_autosave_v2.sql in Supabase SQL Editor.";
    }
    if (code === "42P01") {
      return "Autosave tables are missing. Run docs/sql/course_drafts_autosave_v2.sql in Supabase SQL Editor.";
    }
    if (code === "42501") {
      return "Permission denied by RLS. Ensure you are logged in as the instructor and RLS policies were applied.";
    }
    return err.message || "Draft save failed";
  };

  const persistDraftWithRetry = useCallback(
    async (payloadToSave) => {
      if (!instructorId) return { data: null, error: new Error("Missing instructor id") };
      setSaveState("saving");
      setSaveError(null);

      let lastError = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { data: savedDraft, error } = await saveInstructorDraft(instructorId, payloadToSave);
        if (!error && savedDraft) {
          const ts = savedDraft.last_saved_at ?? savedDraft.updated_at ?? new Date().toISOString();
          if (mountedRef.current) {
            setDraftMeta(savedDraft);
            setLastSavedAt(ts);
            setSaveState("saved");
            setSaveError(null);
          }
          return { data: savedDraft, error: null };
        }

        lastError = error || new Error("Draft save failed");
        if (isNonRetryableSaveError(lastError)) {
          break;
        }
        if (attempt < MAX_RETRIES) {
          await wait(500 * attempt);
        }
      }

      if (mountedRef.current) {
        setSaveState("error");
        setSaveError(humanizeSaveError(lastError));
      }
      return { data: null, error: lastError };
    },
    [instructorId]
  );

  const flushSave = useCallback(async () => {
    if (!latestPayloadRef.current) return { data: null, error: null };
    const snapshot = JSON.stringify(latestPayloadRef.current);
    if (snapshot === lastSavedSnapshotRef.current) {
      return { data: null, error: null };
    }
    const result = await persistDraftWithRetry(latestPayloadRef.current);
    if (!result.error) {
      lastSavedSnapshotRef.current = snapshot;
    } else {
      // Keep trying on future edits; also avoids firing identical failing writes repeatedly.
      lastSavedSnapshotRef.current = "";
    }
    return result;
  }, [persistDraftWithRetry]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!instructorId) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: draft } = await loadDraftForInstructor(instructorId);
      if (cancelled || !draft) {
        setIsHydrating(false);
        return;
      }

      setData(draft.formData);
      setStep(Math.max(0, Math.min(3, draft.currentStep)));
      setLastSavedAt(draft.lastSavedAt);
      setDraftMeta({ id: draft.draftId });
      latestPayloadRef.current = buildDraftPayload(draft.formData, draft.currentStep);
      lastSavedSnapshotRef.current = JSON.stringify(latestPayloadRef.current);
      setSaveState("saved");
      setIsHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [instructorId, setData, setStep]);

  useEffect(() => {
    if (!instructorId || isHydrating) return;
    latestPayloadRef.current = payload;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, DEBOUNCE_MS);
  }, [payload, instructorId, isHydrating, flushSave]);

  useEffect(() => {
    if (!instructorId || isHydrating) return undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSave();
      }
    };
    const onBeforeUnload = () => {
      flushSave();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [instructorId, isHydrating, flushSave]);

  return {
    isHydrating,
    saveState,
    saveError,
    lastSavedAt,
    draftMeta,
    forceSave: flushSave,
  };
}
