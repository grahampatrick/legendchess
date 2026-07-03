import { notFound } from 'next/navigation';

import PlayView from '../../../components/PlayView';
import { loadPuzzle } from '../../../lib/puzzles.server';
import { sealPuzzle } from '../../../lib/seal';

export default async function PlayPage({ params }: { params: Promise<{ puzzleId: string }> }) {
  const { puzzleId } = await params;
  const puzzle = await loadPuzzle(puzzleId);
  if (!puzzle) notFound();
  return (
    <main className="page">
      <div className="site-title">
        <a href="/">
          <span className="knight">♞</span> Play the Legend
        </a>{' '}
        <span style={{ color: 'var(--text-dim)' }}>· free play</span>
      </div>
      <PlayView sealed={sealPuzzle(puzzle)} mode="free" />
    </main>
  );
}
