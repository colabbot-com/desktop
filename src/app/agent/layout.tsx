import Sidebar from "@/components/layout/sidebar";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
