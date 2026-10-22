import TicketList from "./components/ticket-list";

export default function NakesTiketPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Tiket Tindak Lanjut
        </h1>
        <p className="text-sm text-tiby-muted">
          Pantau dan selesaikan eskalasi pasien yang membutuhkan perhatian
          medis.
        </p>
      </div>
      <TicketList />
    </div>
  );
}
