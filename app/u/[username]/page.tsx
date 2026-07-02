import { TabBar } from "@/components/shell/TabBar";
import { ProfileView } from "@/components/profile/ProfileView";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <div className="min-h-dvh pb-tabbar pt-safe">
      <ProfileView username={username} />
      <TabBar />
    </div>
  );
}
