"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import type { ContentItem } from "@/lib/content-types";
import type { View } from "@/app/content/ui/content-presentation";
import { ContentSidebar } from "@/app/content/components/ContentSidebar";
import { RouteTransition } from "@/app/content/RouteTransition";

const LoadingContext = createContext<(loading: boolean) => void>(() => {});

export function useWorkspaceLoading() {
  return useContext(LoadingContext);
}

function viewForPath(pathname: string): View {
  if (pathname === "/contents") return "contents";
  if (pathname === "/schedule") return "calendar";
  if (pathname === "/published") return "published";
  if (pathname === "/failed") return "failed";
  return "dashboard";
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [failedCount, setFailedCount] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [detailView, setDetailView] = useState<View>("dashboard");
  const view = pathname.startsWith("/content/") ? detailView : viewForPath(pathname);

  useEffect(() => {
    setNavigating(false);
    if (pathname.startsWith("/content/")) {
      const from = new URLSearchParams(window.location.search).get("from");
      const sourceView: Record<string, View> = {
        "/contents": "contents",
        "/schedule": "calendar",
        "/published": "published",
        "/failed": "failed",
      };
      setDetailView(sourceView[from ?? ""] ?? "dashboard");
    }
  }, [pathname]);

  useEffect(() => {
    fetch("/api/contents", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          const posts = (result.data as ContentItem[]).flatMap((item) => item.posts);
          setFailedCount(posts.filter((post) => post.status === "failed").length);
        }
      })
      .catch(() => {});
  }, []);

  const setLoading = useMemo(() => (loading: boolean) => setDataLoading(loading), []);
  const destinations: Record<View, string> = {
    dashboard: "/",
    contents: "/contents",
    calendar: "/schedule",
    published: "/published",
    failed: "/failed",
  };

  function navigate(viewToOpen: View) {
    if (destinations[viewToOpen] === pathname) return;
    setNavigating(true);
    router.push(destinations[viewToOpen]);
  }

  return (
    <LoadingContext.Provider value={setLoading}>
      <div className="shell">
        <ContentSidebar view={view} setView={navigate} failedCount={failedCount} />
        <main className="main workspace-main"><RouteTransition>{children}</RouteTransition></main>
      </div>
      {(navigating || dataLoading) && (
        <div className="route-corner-loading" role="status" aria-live="polite">
          <LoaderCircle size={15} className="spin" /> Đang tải
        </div>
      )}
    </LoadingContext.Provider>
  );
}
