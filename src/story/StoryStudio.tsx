import { useEffect, useState } from 'react';
import type { CatRecord, EncounterRecord } from '../storage/types';
import { renderStoryCard, type StoryTheme } from './storyRenderer';

export function StoryStudio({
  cat,
  encounter,
  ownerName,
  onClose,
}: {
  cat: CatRecord;
  encounter: EncounterRecord;
  ownerName: string | null;
  onClose: () => void;
}) {
  const [theme, setTheme] = useState<StoryTheme>('candy');
  const [includeNote, setIncludeNote] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    setBusy(true);
    setBlob(null);
    setPreview(null);
    setError(null);
    void renderStoryCard({ cat, encounter, ownerName, theme, includeNote })
      .then((image) => {
        if (!active) return;
        url = URL.createObjectURL(image);
        setBlob(image);
        setPreview(url);
        setBusy(false);
      }).catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Could not make a story card.');
        setBusy(false);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cat, encounter, ownerName, theme, includeNote]);

  function download() {
    if (!preview) return;
    const safe = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
    const a = document.createElement('a');
    a.href = preview;
    a.download = 'meowfolio-' + safe + '-story.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function share() {
    if (!blob) return;
    const file = new File([blob], 'meowfolio-story.png', { type: 'image/png' });
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      setShareError('Sharing files is not available here. Save the image, then post it to your story.');
      return;
    }
    // Call share directly from the tap; waiting for asynchronous rendering here
    // would lose the mobile browser's user-activation permission.
    void navigator.share({ files: [file], title: 'My Meowfolio story' }).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setShareError('Sharing was unavailable. You can still save the PNG.');
    });
  }

  return (
    <section className="pixel-window story-studio mt-6" aria-label="Create a story card">
      <div className="pixel-window-title"><span>✦ STORY_CARD.EXE</span><span aria-hidden="true">♡</span></div>
      <div className="story-studio-body">
        <div className="story-controls">
          <p className="pixel-kicker">one tiny meeting, one beautiful memory</p>
          <h2 className="pixel-heading mt-2 text-3xl">a story starring {cat.name} ♡</h2>
          <p className="mt-3 text-sm leading-6 text-[#683b55]">
            Make a 1080 × 1920 Instagram or WhatsApp Story card.
            Your photo is rendered in this browser, with no upload and no location details.
          </p>
          <fieldset className="mt-6">
            <legend className="text-sm font-bold">Pick a vibe</legend>
            <div className="story-theme-options mt-3">
              <label className={'story-theme-option story-theme-candy' + (theme === 'candy' ? ' is-selected' : '')}>
                <input
                  type="radio" name="story-theme" value="candy" checked={theme === 'candy'}
                  onChange={() => setTheme('candy')}
                />
                <span>♡</span><b>Candy scrapbook</b>
              </label>
              <label className={'story-theme-option story-theme-midnight' + (theme === 'midnight' ? ' is-selected' : '')}>
                <input
                  type="radio" name="story-theme" value="midnight" checked={theme === 'midnight'}
                  onChange={() => setTheme('midnight')}
                />
                <span>✦</span><b>Midnight diary</b>
              </label>
              <label className={'story-theme-option story-theme-buttercream' + (theme === 'buttercream' ? ' is-selected' : '')}>
                <input
                  type="radio" name="story-theme" value="buttercream" checked={theme === 'buttercream'}
                  onChange={() => setTheme('buttercream')}
                />
                <span>☀</span><b>Golden hour</b>
              </label>
            </div>
          </fieldset>
          {encounter.note?.trim() && (
            <label className="story-note-toggle mt-5">
              <input type="checkbox" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} />
              Include my encounter note (off by default)
            </label>
          )}
          <p className="mt-4 text-xs leading-5 text-[#75435f]">
            The card shows {ownerName ? '“' + ownerName + '”' : '“a cat-loving human”'} as its collector.
            Edit your local profile to change this.
          </p>
          <div className="story-export-actions mt-6">
            <button className="pixel-primary" type="button" onClick={download} disabled={!blob || busy}>
              ↓ Save story PNG
            </button>
            <button className="pixel-secondary" type="button" onClick={share} disabled={!blob || busy}>
              ↗ Share image
            </button>
            <button className="pixel-secondary" type="button" onClick={onClose}>Close studio</button>
          </div>
          {shareError && <p role="status" className="mt-3 text-xs text-[#713f5b]">{shareError}</p>}
        </div>
        <div className="story-preview-wrap">
          {busy && <p role="status">Making your story card…</p>}
          {error && <p role="alert">{error}</p>}
          {preview && <img className="story-preview" src={preview} alt={'9 by 16 story preview for ' + cat.name} />}
          <p className="mt-3 text-center text-xs font-bold text-[#8a3c67]">PREVIEW • 9:16 • PRIVATE BY DEFAULT</p>
        </div>
      </div>
    </section>
  );
}
