import { useState, type ChangeEvent } from 'react';
import { MAX_BACKUP_FILE_BYTES } from '../storage/backup';
import type { MeowfolioRepository } from '../storage/repository';

export function BackupPanel({ repository, onImported }: {
  repository: MeowfolioRepository;
  onImported: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportBackup(): Promise<void> {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const json = await repository.exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'meowfolio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus('Backup downloaded. Keep it private: it includes full photos and any saved locations.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create backup.');
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setError('This backup exceeds the 200 MB mobile import limit.');
      return;
    }
    if (!window.confirm(
      'Restore this Meowfolio backup into this browser? Existing memories will not be deleted. ' +
      'If any IDs are already here, the entire import is rejected without replacing your data.'
    )) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const restored = await repository.importBackupJson(await file.text());
      onImported();
      setStatus('Restored ' + restored.cats + ' cats and ' + restored.encounters +
        ' encounters. Your existing memories were preserved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Backup restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="pixel-window mt-2 sm:mt-7" aria-label="Back up or restore scrapbook">
      <summary className="cursor-pointer px-3 py-2 font-bold text-[#711447] sm:p-4">
        ♡ Back up or restore my cats
      </summary>
      <div className="border-t-2 border-[#7b3157] p-4 sm:p-5">
        <p className="text-sm leading-6 text-[#70415b]">
          Your memories exist only in this browser. Download a private copy before clearing
          browser storage or switching devices. Backups contain full photos, AI data and
          any saved precise locations; do not share them publicly.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="pixel-primary" onClick={() => void exportBackup()} disabled={busy}>
            Download backup
          </button>
          <label className={'pixel-secondary inline-flex cursor-pointer items-center ' + (busy ? 'opacity-50' : '')}>
            Restore backup
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Restore backup"
              disabled={busy}
              onChange={(event) => void importBackup(event)}
            />
          </label>
        </div>
        {status && <p role="status" className="mt-3 text-sm text-[#1f6543]">{status}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-[#981b51]">{error}</p>}
        <p className="mt-3 text-xs text-[#70415b]">
          Restore adds records atomically and never overwrites the same cat ID.
          For a clean restore, use an empty scrapbook on the target device.
        </p>
      </div>
    </details>
  );
}
