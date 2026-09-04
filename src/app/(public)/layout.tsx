export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="slate" className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
