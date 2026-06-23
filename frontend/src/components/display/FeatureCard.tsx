import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="card flex flex-col gap-12 hover:border-mercury-blue/60">
      <Icon size={28} className="text-mercury-blue" />
      <h3 className="text-heading-sm font-display font-w480 text-starlight">{title}</h3>
      <p className="text-body-sm text-silver">{description}</p>
    </div>
  );
}
