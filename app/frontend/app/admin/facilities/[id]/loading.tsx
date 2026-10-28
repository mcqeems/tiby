export default function FacilityDetailLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-6 w-56 rounded bg-gray-200" />
          <div className="h-3 w-40 rounded bg-gray-100" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-gray-200 bg-white" />
    </div>
  );
}
