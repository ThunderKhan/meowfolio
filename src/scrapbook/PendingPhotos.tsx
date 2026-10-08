import { useEffect, useState } from 'react';
import { MeowfolioRepository, type PendingPhoto } from '../storage/repository';

interface PendingPreview {
  record: PendingPhoto;
  url: string;
}

export function PendingPhotos({
  repository,
  refreshKey,
  onProcess,
}: {
  repository: MeowfolioRepository;
  refreshKey: number;
  onProcess: (photo: File, id: string) => void;
}) {
  const [items, setItems] = useState<PendingPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void repository.listPendingPhotos()
      .then((records) => {
        if (!active) return;
        setItems(records.map((record) => {
          const url = URL.createObjectURL(record.photo);
          urls.push(url);
          return { record, url };
        }));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not read saved photos.');
      });
    return () => {
      active = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [repository, refreshKey]);

  async function remove(id: string): Promise<void> {
    if (!window.confirm('Delete this unprocessed photo from this browser?')) return;
    setDeleting(id);
    try {
      await repository.deletePendingPhoto(id);
      setItems((current) => current.filter((item) => item.record.id !== id));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this photo.');
    } finally {
      setDeleting(null);
    }
  }

  if (items.length === 0 && !error) return null;

  return (
    <section className="pixel-window pending-photo-panel mt-5" aria-label="Photos saved for later">
      <div className="pixel-window-title"><span>♡ PHOTO_INBOX.DAT</span><span aria-hidden="true">□ ×</span></div>
      <div className="p-4 sm:p-6">
        <h2 className="pixel-heading text-xl sm:text-2xl">saved for later ♡</h2>
        <p className="mt-2 text-sm leading-6 text-[#75405c]">
          These photos are waiting in this browser. Process them whenever you're ready.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-[#9e1b55]">{error}</p>}
        <div className="pending-photo-grid mt-4 grid gap-3">
          {items.map(({ record, url }) => (
            <div key={record.id} className="pixel-cat-card">
              <img className="aspect-square w-full object-contain" src={url} alt="Cat photo waiting for local AI" />
              <div className="pending-photo-actions grid gap-2 p-3">
                <button
                  type="button"
                  className="pixel-primary"
                  aria-label="Process photo"
                  onClick={() => onProcess(new File([record.photo], record.filename, { type: record.photo.type }), record.id)}
                >
                  Process
                </button>
                <button
                  type="button"
                  className="pixel-secondary"
                  aria-label="Delete photo"
                  onClick={() => void remove(record.id)}
                  disabled={deleting === record.id}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
