import { SettingsNav } from "@/components/parent/settings-nav";
import { PageBody, PageHeader } from "@/components/parent/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Family rules, categories, notifications and your account." />
      <PageBody>
        <SettingsNav />
        {children}
      </PageBody>
    </>
  );
}
