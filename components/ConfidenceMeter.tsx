export default function ConfidenceMeter({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? 'mt-3' : 'mt-4'} w-full text-left`}>
      <div className="mb-1.5 flex items-center justify-between text-xs tracking-wide text-green-100/80 uppercase">
        <span>Confidence</span>
        <span className="font-semibold text-green-100">{value}%</span>
      </div>
      <div className={`${compact ? 'h-2.5' : 'h-3'} w-full rounded-full bg-white/15 overflow-hidden`}>
        <div
          className={`${compact ? 'h-2.5' : 'h-3'} rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-lime-300 transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
