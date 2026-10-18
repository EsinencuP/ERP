/** Restart the 150 ms fade for route content while the surrounding shell keeps its state. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
