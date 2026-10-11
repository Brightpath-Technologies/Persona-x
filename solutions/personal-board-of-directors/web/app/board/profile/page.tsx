"use client";

import { useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  useEffect(() => {
    document.title = "Judgement Profile | Personal Board of Directors";
  }, []);

  return <ProfileForm />;
}
