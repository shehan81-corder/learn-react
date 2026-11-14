import { FileType2, Network } from 'lucide-react';
import type { PrimerId } from '../content/types.ts';

export function PrimerIcon({ id, size = 16 }: { id: PrimerId; size?: number }) {
  return id === 'dom' ? <Network size={size} aria-hidden="true" /> : <FileType2 size={size} aria-hidden="true" />;
}
