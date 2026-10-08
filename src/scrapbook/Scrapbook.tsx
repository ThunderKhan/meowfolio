import { useEffect, useMemo, useState } from 'react';
import type { MeowfolioRepository } from '../storage/repository';
import type { CatRecord, CatSummary, EncounterRecord } from '../storage/types';


interface ScrapbookProps {
  repository: MeowfolioRepository;
  refreshKey: number;
  onSpotCat: () => void;
  ownerName: string | null;
  onCreateStory: (catId: string) => void;
}

interface CatCardView {
  cat: CatRecord;
  coverUrl: string;
}

interface EncounterView {
  encounter: EncounterRecord;
  photoUrl: string;
}

function formatDay(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function formatMoment(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function useCatCards(
  repository: MeowfolioRepository,
  refreshKey: number,
): {
  loading: boolean;
  cards: CatCardView[];
  error: string | null;
} {
  const [state, setState] = useState<{
    loading: boolean;
    cards: CatCardView[];
    error: string | null;
  }>({ loading: true, cards: [], error: null });

  useEffect(() => {
    let active = true;
    const urls: string[] = [];

    void repository
      .getCatSummaries()
      .then((summaries: CatSummary[]) => {
        if (!active) return;
        const cards = summaries.map(({ cat, coverPhoto }) => {
          const coverUrl = URL.createObjectURL(coverPhoto);
          urls.push(coverUrl);
          return { cat, coverUrl };
        });
        setState({ loading: false, cards, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          cards: [],
          error: error instanceof Error ? error.message : 'Could not open the local scrapbook.',
        });
      });

    return () => {
      active = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [repository, refreshKey]);

  return state;
}

function EmptyCollection({ onSpotCat, ownerName }: { onSpotCat: () => void; ownerName: string | null }) {
  return (
    <section className="pixel-window mt-6 empty-scrapbook-panel" aria-labelledby="empty-scrapbook-title">
      <div className="pixel-window-title">
        <span>♥ meowfolio.exe</span>
        <span aria-hidden="true">□ ×</span>
      </div>
      <div className="empty-scrapbook-body px-5 py-10 text-center sm:px-8">
        <div className="pixel-sticker empty-scrapbook-sticker mx-auto" aria-hidden="true">
          ฅ^•ﻌ•^ฅ
        </div>
        <p className="empty-scrapbook-count mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#a91f68]">
          0 cats saved
        </p>
        <h2 id="empty-scrapbook-title" className="pixel-heading empty-scrapbook-title mt-2 text-3xl">
          Your Meowfolio is empty.
        </h2>
        <p className="empty-scrapbook-description mx-auto mt-4 max-w-lg leading-7 text-[#6d3454]">
          <span className="empty-description-desktop">
            The next cat you meet can be the first page. Snap a photo, let the local AI find the
            cat, then you decide who they are.
          </span>
          <span className="empty-description-mobile">
            {ownerName ? ownerName + ', your next little memory awaits. ♡' : 'Every cat has a story. Start yours with the camera above. ♡'}
          </span>
        </p>
        <div className="empty-mobile-steps" aria-label="How Meowfolio works">
          <span><b>01</b> snap</span>
          <span aria-hidden="true">→</span>
          <span><b>02</b> name</span>
          <span aria-hidden="true">→</span>
          <span><b>03</b> remember</span>
        </div>
        <button type="button" className="pixel-primary empty-scrapbook-cta mt-6" onClick={onSpotCat}>
          ♥ Spot a cat ♥
        </button>
      </div>
    </section>
  );
}

function Collection({
  cards,
  onOpen,
  onSpotCat,
  ownerName,
}: {
  cards: CatCardView[];
  onOpen: (catId: string) => void;
  onSpotCat: () => void;
  ownerName: string | null;
}) {
  return (
    <>
      <section className="scrapbook-collection-heading mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pixel-kicker">★ LOCAL CAT MEMORY ARCHIVE ★</p>
          <h1 className="pixel-heading mt-2 text-4xl sm:text-5xl">my meowfolio</h1>
          <p className="mt-3 text-sm leading-6 text-[#6d3454]">
            {ownerName ? ownerName + '’s collection · ' : ''}{cards.length} {cards.length === 1 ? 'cat' : 'cats'} saved in this browser · click a
            photo to open their memory log.
          </p>
        </div>
        <button type="button" className="pixel-primary shrink-0" onClick={onSpotCat}>
          + spot a cat
        </button>
      </section>

      <div className="pixel-divider scrapbook-divider my-6" aria-hidden="true">
        ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥
      </div>

      <section
        aria-label="Saved cats"
        className="scrapbook-cards grid grid-cols-1 gap-5 min-[460px]:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map(({ cat, coverUrl }, index) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onOpen(cat.id)}
            className="pixel-cat-card group text-left"
            aria-label={
              'Open ' +
              cat.name +
              ', met ' +
              cat.encounterCount +
              (cat.encounterCount === 1 ? ' time' : ' times')
            }
          >
            <span className="pixel-photo-frame block">
              <img
                src={coverUrl}
                alt={'Saved photo of ' + cat.name}
                className="aspect-square w-full object-cover"
              />
              <span className="pixel-photo-label" aria-hidden="true">
                IMG_{String(index + 1).padStart(3, '0')}.CAT
              </span>
            </span>
            <span className="block px-3 pb-3 pt-4">
              <span className="flex items-start justify-between gap-3">
                <span className="pixel-heading text-2xl">{cat.name}</span>
                <span className="pixel-badge">x{cat.encounterCount}</span>
              </span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-wide text-[#82405f]">
                Met {cat.encounterCount} {cat.encounterCount === 1 ? 'time' : 'times'}
              </span>
              <span className="mt-1 block text-xs text-[#88566e]">
                last seen: {formatDay(cat.lastSeenAt)}
              </span>
            </span>
          </button>
        ))}
      </section>

      <div className="scrapbook-collection-bottom mt-8 text-center">
        <button type="button" className="pixel-secondary" onClick={onSpotCat}>
          ✦ add another memory ✦
        </button>
      </div>
    </>
  );
}

function LocationDisclosure({ encounter }: { encounter: EncounterRecord }) {
  if (!encounter.location) return null;
  const { latitude, longitude, accuracy } = encounter.location;

  return (
    <details className="pixel-location mt-3">
      <summary>⌖ Location saved</summary>
      <div className="mt-2 grid gap-1 pl-3 text-xs leading-5">
        <span>lat: {latitude.toFixed(5)}°</span>
        <span>long: {longitude.toFixed(5)}°</span>
        <span>accuracy: ±{Math.round(accuracy)} m</span>
      </div>
    </details>
  );
}

function CatDetail({
  repository,
  catId,
  onBack,
  onSpotCat,
  ownerName,
  onCreateStory,
}: {
  repository: MeowfolioRepository;
  catId: string;
  onBack: () => void;
  onSpotCat: () => void;
  ownerName: string | null;
  onCreateStory: (catId: string) => void;
}) {
  const [cat, setCat] = useState<CatRecord | null>(null);
  const [encounters, setEncounters] = useState<EncounterView[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let active = true;
    const urls: string[] = [];

    void Promise.all([repository.getCat(catId), repository.listEncountersForCat(catId)])
      .then(([nextCat, records]) => {
        if (!active) return;
        if (!nextCat) {
          setError('That saved cat could not be found.');
          setLoading(false);
          return;
        }

        const views = records.map((encounter) => {
          const photoUrl = URL.createObjectURL(encounter.photo);
          urls.push(photoUrl);
          return { encounter, photoUrl };
        });

        const coverEncounter =
          records.find((encounter) => encounter.id === nextCat.coverEncounterId) ?? records[0];
        const nextCover = coverEncounter ? URL.createObjectURL(coverEncounter.crop) : null;
        if (nextCover) urls.push(nextCover);

        setCat(nextCat);
        setEncounters(views);
        setCoverUrl(nextCover);
        setError(null);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Could not read this cat history.');
        setLoading(false);
      });

    return () => {
      active = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [catId, repository]);

  if (loading) {
    return (
      <section className="pixel-window mt-6 p-8 text-center" role="status">
        <p className="pixel-heading animate-pulse text-2xl">loading cat memory...</p>
      </section>
    );
  }

  if (error || !cat) {
    return (
      <section className="pixel-window mt-6 p-6">
        <p role="alert" className="font-bold text-[#9e1b55]">
          {error ?? 'Could not open this cat.'}
        </p>
        <button type="button" className="pixel-secondary mt-5" onClick={onBack}>
          ← back to scrapbook
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="pixel-secondary" onClick={onBack}>
          ← scrapbook
        </button>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="pixel-secondary" onClick={() => onCreateStory(catId)}>
            ✦ Make story card
          </button>
          <button type="button" className="pixel-primary" onClick={onSpotCat}>
            + spot a cat
          </button>
        </div>
      </div>

      <section className="pixel-window mt-5">
        <div className="pixel-window-title">
          <span>♡ CAT_PROFILE.DAT</span>
          <span aria-hidden="true">_ □ ×</span>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:p-7">
          <div className="pixel-photo-frame rotate-[-1deg] self-start">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={'Cover photo of ' + cat.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center bg-[#ffd8ed] text-3xl">
                ฅ^•ﻌ•^ฅ
              </div>
            )}
            <span className="pixel-photo-label">★ FAVORITE MEMORY ★</span>
          </div>

          <div className="self-center">
            <p className="pixel-kicker">♥ neighborhood cat file ♥</p>
            <h1 className="pixel-heading mt-2 break-words text-5xl">{cat.name}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="pixel-badge">met {cat.encounterCount}x</span>
              <span className="pixel-badge">local only</span>
            </div>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="pixel-info-box">
                <dt>FIRST SEEN</dt>
                <dd>{formatDay(cat.firstSeenAt)}</dd>
              </div>
              <div className="pixel-info-box">
                <dt>LAST SEEN</dt>
                <dd>{formatDay(cat.lastSeenAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="memory-log-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="pixel-kicker">chronological save file</p>
            <h2 id="memory-log-title" className="pixel-heading mt-1 text-3xl">
              encounter log
            </h2>
          </div>
          <span className="pixel-badge">{encounters.length} entries</span>
        </div>

        <ol className="pixel-timeline mt-5 grid gap-6">
          {encounters.map(({ encounter, photoUrl }, index) => (
            <li key={encounter.id} className="pixel-memory-card">
              <div className="pixel-memory-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="grid gap-5 p-4 sm:grid-cols-[180px_1fr] sm:p-5">
                <div className="pixel-photo-frame">
                  <img
                    src={photoUrl}
                    alt={'Encounter with ' + cat.name + ' on ' + formatDay(encounter.timestamp)}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="pixel-photo-label">{formatDay(encounter.timestamp)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a91f68]">
                    ♥ sighting #{index + 1}
                  </p>
                  <h3 className="pixel-heading mt-1 text-xl">{formatMoment(encounter.timestamp)}</h3>
                  {encounter.note ? (
                    <div className="pixel-note mt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#a91f68]">
                        note.txt
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words leading-6 text-[#54233d]">
                        {encounter.note}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm italic text-[#8f6077]">no note for this meeting</p>
                  )}
                  <LocationDisclosure encounter={encounter} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function Scrapbook({ repository, refreshKey, onSpotCat, ownerName, onCreateStory }: ScrapbookProps) {
  const { loading, cards, error } = useCatCards(repository, refreshKey);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const selectedExists = useMemo(
    () => !selectedCatId || cards.some(({ cat }) => cat.id === selectedCatId),
    [cards, selectedCatId],
  );

  useEffect(() => {
    if (!selectedExists) setSelectedCatId(null);
  }, [selectedExists]);

  if (selectedCatId) {
    return (
      <CatDetail
        repository={repository}
        catId={selectedCatId}
        onBack={() => setSelectedCatId(null)}
        onSpotCat={onSpotCat}
        ownerName={ownerName}
        onCreateStory={onCreateStory}
      />
    );
  }

  if (loading) {
    return (
      <section className="pixel-window mt-6 p-8 text-center" role="status">
        <p className="pixel-heading animate-pulse text-2xl">opening scrapbook...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="pixel-window mt-6 p-6">
        <p className="pixel-kicker">storage error</p>
        <h2 className="pixel-heading mt-2 text-2xl">Couldn’t open your saved cats.</h2>
        <p role="alert" className="mt-3 leading-6 text-[#6d3454]">
          {error}
        </p>
        <button type="button" className="pixel-primary mt-5" onClick={onSpotCat}>
          Start a new scan
        </button>
      </section>
    );
  }

  if (cards.length === 0) return <EmptyCollection onSpotCat={onSpotCat} ownerName={ownerName} />;

  return <Collection cards={cards} onOpen={setSelectedCatId} onSpotCat={onSpotCat} ownerName={ownerName} />;
}
