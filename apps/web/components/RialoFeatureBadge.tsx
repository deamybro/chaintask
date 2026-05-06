type RialoFeature = 'native_https' | 'reactive_tx' | 'real_world_identity' | 'escrow_pda' | 'confidential_computing';

const labels: Record<RialoFeature, string> = {
  native_https: 'Native HTTPS',
  reactive_tx: 'Reactive TX',
  real_world_identity: 'RW Identity',
  escrow_pda: 'Escrow PDA',
  confidential_computing: 'Confidential'
};

export default function RialoFeatureBadge({ feature }: { feature: RialoFeature }) {
  return (
    <span className="mono inline-flex items-center rounded border border-accent/50 bg-[var(--accent-dim)] px-2 py-1 text-[11px] text-accent transition hover:shadow-[0_0_18px_rgba(0,229,160,0.2)]">
      RIALO: {labels[feature]}
    </span>
  );
}
