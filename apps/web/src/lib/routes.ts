import { useEffect, useState } from "react";

export type Route =
  | { name: "landing" }
  | { name: "dashboard" }
  | { name: "new" }
  | { name: "providers" }
  | { name: "reservation"; id: bigint }
  | { name: "not-found" };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#/, "") || "/";
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "landing" };
  if (parts[0] !== "app") return { name: "not-found" };
  if (parts.length === 1) return { name: "dashboard" };
  if (parts[1] === "new") return { name: "new" };
  if (parts[1] === "providers") return { name: "providers" };
  if (parts[1] === "reservations" && parts[2]) {
    try {
      return { name: "reservation", id: BigInt(parts[2]) };
    } catch {
      return { name: "not-found" };
    }
  }
  return { name: "not-found" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith("/") ? path : `/${path}`;
}

export function appPath(suffix = ""): string {
  return `#/app${suffix}`;
}
