import { LoaderCircle } from "lucide-react";

export default function WorkspaceRouteLoading() {
  return <div className="route-corner-loading" role="status"><LoaderCircle size={15} className="spin" /> Đang tải trang</div>;
}
