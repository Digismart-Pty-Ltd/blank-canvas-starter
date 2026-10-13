import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RewardTier = "Pink" | "Silver" | "Gold" | "Platinum" | "Special";

export type MemberReward = {
  id: string;
  tier: RewardTier;
  title: string;
  description: string;
  createdAt: string;
  expiresInDays: number | null;
};

export type MyRedemption = { id: string; rewardId: string; redeemedAt: string };

export const REDEEM_MESSAGES = [
  "Invalid reward code",
  "This reward is not available for your tier",
  "This reward has expired",
  "Already redeemed",
  "Reward redemption is not configured",
];

export async function fetchRewards(): Promise<MemberReward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("id, tier, title, description, expires_in_days, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    tier: r.tier as RewardTier,
    title: r.title,
    description: r.description ?? "",
    createdAt: r.created_at,
    expiresInDays: r.expires_in_days,
  }));
}

export async function fetchMyRedemptions(userId: string): Promise<MyRedemption[]> {
  const { data, error } = await supabase
    .from("redemptions")
    .select("id, reward_id, redeemed_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, rewardId: r.reward_id, redeemedAt: r.redeemed_at }));
}

export async function redeemReward(rewardId: string, code: string) {
  const { error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId, p_code: code });
  if (error) throw error;
}

export function isRewardExpired(r: MemberReward, now = Date.now()) {
  if (r.expiresInDays == null) return false;
  return now > new Date(r.createdAt).getTime() + r.expiresInDays * 86_400_000;
}

/** Rewards for the member's tier plus Special, hiding expired ones. */
export function rewardsForTier(all: MemberReward[], tier: string | null | undefined) {
  if (!tier) return [];
  const now = Date.now();
  return all.filter((r) => (r.tier === tier || r.tier === "Special") && !isRewardExpired(r, now));
}

export function useRewards(enabled: boolean) {
  const [rewards, setRewards] = useState<MemberReward[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      fetchRewards()
        .then((r) => alive && setRewards(r))
        .catch((err) => console.error("Failed to load rewards:", err));
    load();
    const channel = supabase
      .channel(`rewards-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [enabled]);
  return rewards;
}

export function useMyRedemptions(userId: string | null | undefined) {
  const [redemptions, setRedemptions] = useState<MyRedemption[]>([]);
  const reload = useCallback(async () => {
    if (!userId) {
      setRedemptions([]);
      return;
    }
    try {
      setRedemptions(await fetchMyRedemptions(userId));
    } catch (err) {
      console.error("Failed to load redemptions:", err);
    }
  }, [userId]);

  useEffect(() => {
    reload();
    if (!userId) return;
    const channel = supabase
      .channel(`my-redemptions-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "redemptions", filter: `user_id=eq.${userId}` },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  return { redemptions, reload };
}
