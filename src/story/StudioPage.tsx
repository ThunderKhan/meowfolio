import { useEffect, useState } from 'react';
import type { MeowfolioRepository } from '../storage/repository';
import type { CatRecord, EncounterRecord } from '../storage/types';
import { StoryStudio } from './StoryStudio';

export function StudioPage({
  repository, catId, ownerName, onBack,
}: {
  repository: MeowfolioRepository;
  catId: string;
  ownerName: string | null;
  onBack: () => void;
}) {
  const [entry, setEntry] = useState<{ cat: CatRecord; encounter: EncounterRecord } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Story Studio · Meowfolio';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    let active = true;
    setEntry(null);
    setError(null);
    void Promise.all([repository.getCat(catId), repository.listEncountersForCat(catId)])
      .then(([cat, encounters]) => {
        if (!active) return;
        const encounter = encounters[encounters.length - 1];
        if (!cat || !encounter) {
          setError('This cat memory is not available in this browser.');
          return;
        }
        setEntry({ cat, encounter });
      })
      .catch(() => { if (active) setError('Could not read this cat from local storage.'); });
    return () => { active = false; };
  }, [catId, repository]);

  useEffect(() => {
    if (entry) document.getElementById('studio-title')?.focus();
  }, [entry]);

  return (
    <main className="studio-page min-h-screen px-3 py-4 sm:px-6 sm:py-8">
      <div className="studio-page-shell mx-auto max-w-6xl">
        <header className="studio-page-nav">
          <button type="button" className="pixel-secondary" onClick={onBack}>← Back to scrapbook</button>
          <span className="pixel-kicker">Meowfolio · Story Studio</span>
        </header>
        {error ? (
          <section className="pixel-window mt-6 p-6" role="alert">
            <h1 className="pixel-heading text-2xl">Can't open this memory</h1>
            <p className="mt-3">{error}</p>
            <button type="button" className="pixel-secondary mt-5" onClick={onBack}>Back to scrapbook</button>
          </section>
        ) : !entry ? (
          <section className="pixel-window mt-6 p-8" role="status">Opening the saved photo…</section>
        ) : (
          <StoryStudio
            key={catId}
            cat={entry.cat}
            encounter={entry.encounter}
            ownerName={ownerName}
          />
        )}
      </div>
    </main>
  );
}
