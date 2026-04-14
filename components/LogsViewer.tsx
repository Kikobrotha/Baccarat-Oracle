export default function LogsViewer({ logs }: { logs: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Windsurf logs</h3>
      <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
        {logs.length ? logs.join('\n') : 'Run windsurf mode to see logs.'}
      </pre>
    </section>
  );
}
