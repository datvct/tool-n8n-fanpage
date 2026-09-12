import ContentEditorRoute from "@/app/content/ContentEditorRoute";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentEditorRoute id={id} />;
}
