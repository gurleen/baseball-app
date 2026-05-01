import usePageTitle from "@/hooks/usePageTitle";
import { Navigate } from "react-router";

export default function NotFound() {
  usePageTitle("404");
  return (
    <main className="h-full py-10 px-10 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">404</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Page not found</h1>
        <p className="text-neutral-600">The page you requested does not exist.</p>
      </div>
    </main>
  );
}

export const NotFoundRedirect = () => {
    return <Navigate to="/404" replace />;
}