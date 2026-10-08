import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Placeholder" },
      { name: "description", content: "Placeholder page" },
      { property: "og:title", content: "Placeholder" },
      { property: "og:description", content: "Placeholder page" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">Placeholder</h1>
    </div>
  );
}
