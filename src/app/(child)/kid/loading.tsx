export default function KidLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3.5">
        <div className="h-14 w-14 rounded-full bg-surface-2" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-7 w-40 rounded-lg bg-surface-2" />
          <div className="h-4 w-24 rounded bg-surface-2" />
        </div>
      </div>
      <div className="h-[190px] rounded-[20px] bg-surface" />
      <div className="h-4 w-24 rounded bg-surface-2" />
      <div className="h-[150px] rounded-[20px] bg-surface" />
      <div className="h-[72px] rounded-[20px] bg-surface" />
      <div className="h-[150px] rounded-[20px] bg-surface" />
    </div>
  );
}
