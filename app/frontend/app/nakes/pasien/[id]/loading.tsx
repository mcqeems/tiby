export default function PatientDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-5 pb-10">
      <div className="h-3 w-28 rounded bg-gray-100" />
      <div className="h-28 rounded-2xl border border-gray-200 bg-white" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 rounded-2xl border border-gray-200 bg-white" />
        <div className="h-40 rounded-2xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}
