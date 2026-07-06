"use client";

import { useEffect, useState } from "react";
import {
  guestHasCompletedCurrentAssessment,
  hydrateGuestMatch,
  loadGuestMatches,
  loadGuestProfile,
  saveGuestMatches,
} from "@/lib/guest-session";
import type { CareerMatch, CareerProfile } from "@/lib/types";

const GUEST_MATCH_LIMIT = 5;

export function useGuestMatches(limit = 5) {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [matches, setMatches] = useState<CareerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assessmentReady = guestHasCompletedCurrentAssessment(profile);

  useEffect(() => {
    const storedProfile = loadGuestProfile();
    const storedMatches = loadGuestMatches();
    setProfile(storedProfile);
    setMatches(storedMatches);

    if (!guestHasCompletedCurrentAssessment(storedProfile)) return;
    if (storedMatches.length >= Math.min(limit, GUEST_MATCH_LIMIT)) return;

    let cancelled = false;

    async function fetchMatches() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/guest/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: storedProfile, limit: GUEST_MATCH_LIMIT }),
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.error ?? "Không thể tính gợi ý nghề nghiệp.");
        }

        const nextMatches = Array.isArray(data)
          ? data.map(hydrateGuestMatch).filter((match): match is CareerMatch => Boolean(match))
          : [];
        if (cancelled) return;
        setMatches(nextMatches);
        saveGuestMatches(nextMatches);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Có lỗi khi tính gợi ý.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchMatches();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return {
    profile,
    matches: matches.slice(0, limit),
    allMatches: matches,
    assessmentReady,
    isLoading,
    error,
  };
}
