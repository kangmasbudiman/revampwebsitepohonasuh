// Pilihan jumlah baris per halaman untuk tabel admin (pola datatable).
export default function RowsPerPage({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label
      data-testid="per-page"
      className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
    >
      Tampil
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-800 focus:outline-none dark:border-night-700 dark:bg-night-900 dark:text-emerald-300"
      >
        {[5, 10, 25, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      baris
    </label>
  );
}
