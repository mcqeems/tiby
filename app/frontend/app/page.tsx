export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-tiby-white px-4">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-600 text-tiby-ink">
          Tiby
        </h1>
        <p className="mt-2 text-sm text-tiby-muted font-body">
          Pendamping harian kesehatan Anda
        </p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-full bg-tiby-teal-600 px-6 py-3 text-white font-medium font-body transition hover:bg-tiby-teal-700"
        >
          Masuk
        </a>
      </div>
    </div>
  );
}
