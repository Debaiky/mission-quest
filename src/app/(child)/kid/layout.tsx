import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { BottomNav } from "@/components/child/bottom-nav";
import { CelebrationProvider } from "@/components/celebrations/celebration-provider";
import { cn } from "@/lib/utils";
import { resolveChildSettings } from "@/types/domain";

export default async function KidLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireChild();
  const child = await prisma.child.findUnique({ where: { id: ctx.childId }, select: { settings: true } });
  const settings = resolveChildSettings(child?.settings);

  return (
    <div data-theme="sunrise" className={cn("kid-ground flex min-h-screen flex-col", settings.theme === "night" && "dark")}>
      <CelebrationProvider animationsEnabled={settings.animations} soundEnabled={settings.sound}>
        <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-28 pt-12 md:pt-10">{children}</main>
        <BottomNav />
      </CelebrationProvider>
    </div>
  );
}
