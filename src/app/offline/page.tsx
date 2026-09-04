export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main data-theme="sunrise" className="kid-ground flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        📡
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink">You&apos;re offline</h1>
      <p className="max-w-sm text-[15px] font-bold text-muted">Mission Quest needs the internet to save your missions. Check your connection and try again — nothing is lost.</p>
    </main>
  );
}
