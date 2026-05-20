import { isViewAuthed } from "@/lib/view-auth";
import PasscodeGate from "@/components/view/PasscodeGate";
import ViewNav from "@/components/view/ViewNav";

export default async function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isViewAuthed();
  if (!authed) {
    return <PasscodeGate />;
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ViewNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
