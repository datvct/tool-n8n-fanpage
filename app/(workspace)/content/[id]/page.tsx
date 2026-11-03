import ContentEditorRoute from "@/app/content/ContentEditorRoute";

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ platform?: string; from?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const platform = ["facebook", "linkedin", "youtube", "tiktok"].includes(query.platform ?? "")
    ? query.platform as "facebook" | "linkedin" | "youtube" | "tiktok"
    : undefined;
  const validReturnPaths = ["/", "/contents", "/schedule", "/published", "/failed"];
  const returnTo = validReturnPaths.includes(query.from ?? "") ? query.from! : "/";
  return <ContentEditorRoute id={id} initialPlatform={platform} returnTo={returnTo} />;
}
