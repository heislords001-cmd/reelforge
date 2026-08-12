import { useState } from 'react';
import { Scene, Script } from '../../lib/types';
import { api } from '../../lib/api';

interface Props {
  projectId: string;
  script: Script;
  scenes: Scene[];
  onSceneUpdated: () => void;
}

export function ScriptEditor({ projectId, script, scenes, onSceneUpdated }: Props) {
  return (
    <div className="space-y-4">
      <FixedBlock label="Hook" text={script.hook} />
      <FixedBlock label="Introduction" text={script.introduction} />

      {scenes.map((scene, i) => (
        <ChapterBlock key={scene.id} index={i} projectId={projectId} scene={scene} onSaved={onSceneUpdated} />
      ))}

      <FixedBlock label="Conclusion" text={script.conclusion} />
      <FixedBlock label="Call to action" text={script.call_to_action} />
    </div>
  );
}

function FixedBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="glass-card p-5">
      <p className="label-eyebrow mb-2">{label}</p>
      <p className="text-sm leading-relaxed text-ink/90">{text}</p>
    </div>
  );
}

function ChapterBlock({
  index,
  projectId,
  scene,
  onSaved,
}: {
  index: number;
  projectId: string;
  scene: Scene;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(scene.chapter_title);
  const [narration, setNarration] = useState(scene.narration_text);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.projects.updateScene(projectId, scene.id, { chapterTitle: title, narrationText: narration });
      setDirty(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="label-eyebrow flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.08] text-[10px] text-ink">
            {index + 1}
          </span>
          Chapter
        </p>
        {dirty && (
          <button onClick={save} disabled={saving} className="btn-ghost text-signal-300">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        onBlur={() => dirty && save()}
        className="mb-2 w-full bg-transparent text-[15px] font-semibold text-ink outline-none"
      />
      <textarea
        value={narration}
        onChange={(e) => {
          setNarration(e.target.value);
          setDirty(true);
        }}
        onBlur={() => dirty && save()}
        rows={3}
        className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink/90 outline-none"
      />
    </div>
  );
}
