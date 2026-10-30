import type { ContentStatus } from "@/lib/content-types";

const steps = ["Soạn nội dung", "Duyệt", "Lên lịch", "Đăng"];

export function PostWorkflow({ status, hasPost }: { status: ContentStatus; hasPost: boolean }) {
  if (!hasPost) return null;

  const currentIndex = status === "draft" ? 0 : status === "approved" ? 1 : status === "scheduled" ? 2 : 3;
  const finalLabel = status === "failed" ? "Đăng lỗi" : steps[3];

  return (
    <ol className={`post-workflow ${status}`} aria-label="Các bước xử lý bài viết">
      {steps.map((step, index) => {
        const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending";
        return (
          <li className={`workflow-step ${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
            <span className="workflow-marker">{index + 1}</span>
            <span className="workflow-label">{index === 3 ? finalLabel : step}</span>
          </li>
        );
      })}
    </ol>
  );
}
