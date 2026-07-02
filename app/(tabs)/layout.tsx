import { TabBar } from "@/components/shell/TabBar";

export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh pb-tabbar">
      {children}
      <TabBar />
    </div>
  );
}
