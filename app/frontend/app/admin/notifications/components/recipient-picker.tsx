"use client";

import { useEffect, useState } from "react";
import { usersApi, type UserItem } from "@/lib/api/users";
import { roleLabel } from "@/lib/roles";
import { Loader2, Plus, Search, UserRound, X } from "lucide-react";

const MAX_RECIPIENTS = 50;
const RESULT_LIMIT = 8;

const ROLE_FILTERS = [
  { value: "ALL", label: "Semua peran" },
  { value: "PASIEN", label: "Pasien" },
  { value: "PMO", label: "PMO" },
  { value: "NAKES", label: "Nakes" },
  { value: "ADMIN", label: "Admin" },
];

interface RecipientPickerProps {
  selected: UserItem[];
  onChange: (next: UserItem[]) => void;
}

/**
 * Search-first picker. The list only shows a handful of matches so the admin
 * narrows with search instead of scanning every account in the platform.
 */
export default function RecipientPicker({
  selected,
  onChange,
}: RecipientPickerProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [options, setOptions] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await usersApi.list({
          search: search.trim() || undefined,
          role: role === "ALL" ? undefined : role,
          limit: RESULT_LIMIT,
        });
        if (active) setOptions(res.items || []);
      } catch {
        if (active) setError("Tidak dapat memuat daftar pengguna.");
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, role]);

  const atLimit = selected.length >= MAX_RECIPIENTS;
  const isSelected = (id: string) => selected.some((user) => user.id === id);

  const add = (user: UserItem) => {
    if (atLimit || isSelected(user.id)) return;
    onChange([...selected, user]);
  };

  const remove = (id: string) => {
    onChange(selected.filter((user) => user.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, username, atau email…"
            aria-label="Cari penerima"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter peran penerima"
          className="h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
        >
          {ROLE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-tiby-teal-50 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-tiby-teal-800"
            >
              <span className="truncate">{user.name}</span>
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-tiby-teal-600">
                {roleLabel(user.role)}
              </span>
              <button
                type="button"
                onClick={() => remove(user.id)}
                aria-label={`Hapus ${user.name} dari penerima`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-tiby-teal-600 transition hover:bg-tiby-teal-100 hover:text-tiby-teal-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        {loading ? (
          <p className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-tiby-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Mencari pengguna…
          </p>
        ) : error ? (
          <p className="px-4 py-6 text-center text-xs text-red-600">{error}</p>
        ) : options.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-tiby-muted">
            Tidak ada pengguna yang cocok.
          </p>
        ) : (
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {options.map((user) => {
              const added = isSelected(user.id);
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => (added ? remove(user.id) : add(user))}
                    disabled={!added && atLimit}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      added ? "bg-tiby-teal-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-tiby-ink">
                        {user.name}
                      </span>
                      <span className="block truncate text-[11px] text-tiby-muted">
                        @{user.username || "-"}
                        {user.facility ? ` · ${user.facility}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-600">
                      {user.role}
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        added
                          ? "bg-tiby-teal-600 text-white"
                          : "border border-gray-200 text-gray-400"
                      }`}
                    >
                      {added ? <X className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-tiby-muted">
        {selected.length}/{MAX_RECIPIENTS} penerima dipilih.{" "}
        {atLimit ? "Batas tercapai, hapus salah satu untuk menambah." : ""}
      </p>
    </div>
  );
}
