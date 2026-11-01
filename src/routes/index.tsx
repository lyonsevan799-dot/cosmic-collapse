import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CosmicCollapse = lazy(() => import("@/components/CosmicCollapse"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Collapse — Black Hole Arcade" },
      { name: "description", content: "Grow endlessly by absorbing cosmic objects, or compete against 100 local AI black holes in Cosmic Collapse's offline arena." },
      { property: "og:title", content: "Cosmic Collapse — Black Hole Arcade" },
      { property: "og:description", content: "Endless black-hole growth and an offline AI arena with live rankings, cosmic absorption and unlockable skins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <h1 className="cc-title text-3xl">Cosmic Collapse</h1>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <CosmicCollapse />
      </Suspense>
    </ClientOnly>
  );
}
