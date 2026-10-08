import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceKm(distanceKm: number | string | null | undefined): string {
  if (typeof distanceKm === "string") {
    return distanceKm.trim() === "" ? "0" : distanceKm.trim();
  }

  if (typeof distanceKm === "number") {
    if (!Number.isFinite(distanceKm)) {
      return "0";
    }

    return new Intl.NumberFormat("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(distanceKm);
  }

  return "0";
}