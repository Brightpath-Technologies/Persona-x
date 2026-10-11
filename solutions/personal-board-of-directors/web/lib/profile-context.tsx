"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { WebUserProfile } from "./types";

const STORAGE_KEY = "persona-x-user-profile";

interface ProfileContextValue {
  profile: WebUserProfile | null;
  saveProfile: (profile: WebUserProfile) => void;
  clearProfile: () => void;
  hasProfile: boolean;
  loaded: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext must be used within ProfileProvider");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<WebUserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch {
      // localStorage unavailable or corrupt data
    }
    setLoaded(true);
  }, []);

  const saveProfile = useCallback((p: WebUserProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        saveProfile,
        clearProfile,
        hasProfile: !!profile,
        loaded,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
