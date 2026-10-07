import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AiClient } from '../ai/client';
import { cropImageBlob } from '../browser/images';
import { evaluateMatching } from './evaluator';
import { createPublicMatchingEvidence } from './publicReport';
import type {
  EvaluationDataset,
  EvaluationFailure,
  EvaluationPartition,
  EvaluationSample,
  MatchingEvaluationReport,
} from './types';

interface ManifestEntry {
  assetId: string;
  file: string;
  catId: string;
  partition: EvaluationPartition;
  order: number;
}

interface EvaluationManifest {
  version: 1;
  samples: ManifestEntry[];
}

function parseManifest(text: string): EvaluationManifest {
  const parsed = JSON.parse(text) as Partial<EvaluationManifest>;
  if (parsed.version !== 1 || !Array.isArray(parsed.samples)) {
    throw new Error('Manifest must have version: 1 and a samples array.');
  }

  const seen = new Set<string>();
  for (const entry of parsed.samples) {
    if (
      !entry ||
      typeof entry.assetId !== 'string' ||
      typeof entry.file !== 'string' ||
      typeof entry.catId !== 'string' ||
      !['reference', 'development-query', 'holdout'].includes(entry.partition) ||
      !Number.isFinite(entry.order)
    ) {
      throw new Error('Every manifest sample needs assetId, file, catId, partition, and order.');
    }
    if (seen.has(entry.assetId)) throw new Error('Duplicate assetId: ' + entry.assetId);
    seen.add(entry.assetId);
  }

  return parsed as EvaluationManifest;
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function MatchingLab({ onExit }: { onExit: () => void }) {
  const aiRef = useRef<AiClient | null>(null);
  const [manifest, setManifest] = useState<EvaluationManifest | null>(null);
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [modelsReady, setModelsReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MatchingEvaluationReport | null>(null);

  useEffect(
    () => () => {
      aiRef.current?.dispose();
      aiRef.current = null;
    },
    [],
  );

  const missingFiles = useMemo(() => {
    if (!manifest) return [];
    return manifest.samples.filter((sample) => !files.has(sample.file)).map((sample) => sample.file);
  }, [files, manifest]);

  async function onManifest(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      setManifest(parseManifest(await file.text()));
      setReport(null);
      setError(null);
    } catch (reason) {
      setManifest(null);
      setError(reason instanceof Error ? reason.message : 'Could not read evaluation manifest.');
    }
  }

  function onImages(event: ChangeEvent<HTMLInputElement>): void {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    setFiles(new Map(selected.map((file) => [file.name, file])));
    setReport(null);
    setError(null);
  }

  async function prepareModels(): Promise<void> {
    setError(null);
    try {
      const ai = aiRef.current ?? new AiClient();
      aiRef.current = ai;
      const status = await ai.checkAssets('wasm');
      await ai.loadModels('wasm', !status.ready);
      setModelsReady(true);
    } catch (reason) {
      setModelsReady(false);
      setError(reason instanceof Error ? reason.message : 'Could not prepare local models.');
    }
  }

  async function runEvaluation(): Promise<void> {
    if (!manifest || missingFiles.length > 0 || !modelsReady || running) return;
    const ai = aiRef.current;
    if (!ai) return;

    setRunning(true);
    setReport(null);
    setError(null);

    const samples: EvaluationSample[] = [];
    const failures: EvaluationFailure[] = [];
    const total = manifest.samples.length;
    setProgress({ done: 0, total, label: 'starting' });

    for (let index = 0; index < manifest.samples.length; index += 1) {
      const item = manifest.samples[index];
      const file = files.get(item.file)!;
      setProgress({ done: index, total, label: item.assetId });

      try {
        const detection = await ai.detect(file, 0.25);
        if (detection.detections.length === 0) {
          failures.push({ ...item, partition: item.partition, reason: 'no-cat' });
          continue;
        }
        if (detection.detections.length !== 1) {
          failures.push({ ...item, partition: item.partition, reason: 'multiple-cats' });
          continue;
        }

        const crop = await cropImageBlob(file, detection.detections[0].box);
        const embedding = await ai.embed(crop);

        samples.push({
          assetId: item.assetId,
          catId: item.catId,
          partition: item.partition,
          order: item.order,
          embedding: embedding.embedding,
          embeddingSpace: embedding.space,
        });
      } catch {
        failures.push({
          assetId: item.assetId,
          catId: item.catId,
          partition: item.partition,
          reason: 'embedding-failed',
        });
      } finally {
        setProgress({ done: index + 1, total, label: item.assetId });
      }
    }

    try {
      const dataset: EvaluationDataset = { version: 1, samples, failures };
      setReport(evaluateMatching(dataset));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Evaluation could not be completed.');
    } finally {
      setRunning(false);
    }
  }

  const selectedHoldout = report
    ? report.holdoutByStrategy[report.selectedPolicy.strategy].summary
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <header className="pixel-window">
        <div className="pixel-window-title">
          <span>★ MATCHING_LAB.LOCAL ★</span>
          <span aria-hidden="true">_ □ ×</span>
        </div>
        <div className="p-5 sm:p-7">
          <button type="button" className="pixel-secondary" onClick={onExit}>
            ← back to meowfolio
          </button>
          <p className="pixel-kicker mt-6">development-only evidence tool</p>
          <h1 className="pixel-heading mt-2 text-4xl">familiar-face matching lab</h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#6d3454]">
            Select a manifest and its real cat photos. Images are processed through the same local
            detector and DINOv2 embedder. Multi-cat photos are rejected rather than silently
            choosing a subject. The public report contains aggregate/anonymized evidence only.
          </p>
        </div>
      </header>

      <section className="pixel-window mt-6 p-5 sm:p-7">
        <h2 className="pixel-heading text-2xl">01 // load dataset</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="pixel-note block cursor-pointer">
            <span className="pixel-kicker">manifest.json</span>
            <span className="mt-2 block text-sm">Choose manifest</span>
            <input type="file" accept="application/json,.json" className="mt-3 block w-full text-sm" onChange={(event) => void onManifest(event)} />
          </label>
          <label className="pixel-note block cursor-pointer">
            <span className="pixel-kicker">cat photos</span>
            <span className="mt-2 block text-sm">Choose all referenced image files</span>
            <input type="file" accept="image/*" multiple className="mt-3 block w-full text-sm" onChange={onImages} />
          </label>
        </div>
        <div className="mt-4 text-sm text-[#6d3454]">
          <p>manifest samples: {manifest?.samples.length ?? 0}</p>
          <p>selected image files: {files.size}</p>
          <p>missing referenced files: {missingFiles.length}</p>
        </div>
        {missingFiles.length > 0 && (
          <details className="pixel-location mt-3">
            <summary>show missing filenames</summary>
            <ul className="mt-2 grid gap-1 text-xs">
              {missingFiles.slice(0, 20).map((file) => <li key={file}>{file}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section className="pixel-window mt-6 p-5 sm:p-7">
        <h2 className="pixel-heading text-2xl">02 // prepare local models</h2>
        <p className="mt-3 text-sm leading-6 text-[#6d3454]">
          This button is explicit authorization to download missing pinned model assets for this
          local evaluation.
        </p>
        <button type="button" className="pixel-primary mt-4" disabled={running || modelsReady} onClick={() => void prepareModels()}>
          {modelsReady ? 'models ready ✓' : 'download / prepare models'}
        </button>
      </section>

      <section className="pixel-window mt-6 p-5 sm:p-7">
        <h2 className="pixel-heading text-2xl">03 // run frozen evaluation</h2>
        <button
          type="button"
          className="pixel-primary mt-4"
          disabled={!manifest || missingFiles.length > 0 || !modelsReady || running}
          onClick={() => void runEvaluation()}
        >
          {running ? 'evaluating...' : 'run evaluation'}
        </button>
        {progress.total > 0 && (
          <div className="mt-4">
            <p className="text-sm font-bold">
              {progress.done}/{progress.total} · {progress.label}
            </p>
            <progress className="mt-2 w-full" value={progress.done} max={progress.total} />
          </div>
        )}
        {error && <p role="alert" className="mt-4 border-2 border-[#9e1b55] bg-[#fff0f7] p-3 text-sm font-bold text-[#9e1b55]">{error}</p>}
      </section>

      {report && selectedHoldout && (
        <section className="pixel-window mt-6 p-5 sm:p-7">
          <p className="pixel-kicker">result // {report.release.enabledRecommended ? 'candidate to enable' : 'keep disabled'}</p>
          <h2 className="pixel-heading mt-2 text-3xl">
            {report.release.enabledRecommended ? 'evidence gate passed' : 'matching stays off'}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pixel-info-box"><dt>strategy</dt><dd>{report.selectedPolicy.strategy}</dd></div>
            <div className="pixel-info-box"><dt>threshold</dt><dd>{report.selectedPolicy.threshold.toFixed(6)}</dd></div>
            <div className="pixel-info-box"><dt>held-out correct</dt><dd>{selectedHoldout.correctSuggestions}/{selectedHoldout.repeatQueries}</dd></div>
            <div className="pixel-info-box"><dt>wrong suggestions</dt><dd>{selectedHoldout.wrongSuggestions}</dd></div>
          </div>
          {report.release.reasons.length > 0 && (
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-[#6d3454]">
              {report.release.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
          <button
            type="button"
            className="pixel-secondary mt-6"
            onClick={() => downloadJson('meowfolio-matching-evidence.public.json', createPublicMatchingEvidence(report))}
          >
            export anonymized evidence JSON
          </button>
        </section>
      )}
    </main>
  );
}
