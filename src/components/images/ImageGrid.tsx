import { useState } from 'react';
import { Download, ImageOff, RefreshCw } from 'lucide-react';
import { Scene, SceneImage } from '../../lib/types';
import { api } from '../../lib/api';
import { Spinner } from '../ui/Primitives';

interface Props {
  projectId: string;
  scenes: Scene[];
  images: SceneImage[];
  onChanged: () => void;
}

export function ImageGrid({ projectId, scenes, images, onChanged }: Props) {
  // Group ALL images per scene (not just the selected one). Premium generates multiple
  // variants per scene, and the card below shows a small switcher when there's more than one.
  const imagesByScene = new Map<string, SceneImage[]>();
  for (const img of images) {
    const list = imagesByScene.get(img.scene_id) ?? [];
    list.push(img);
    imagesByScene.set(img.scene_id, list);
  }

  function downloadAll() {
    for (const [, variants] of imagesByScene) {
      const selected = variants.find((v) => v.is_selected) ?? variants[0];
      if (!selected) continue;
      const a = document.createElement('a');
      a.href = selected.url;
      a.download = `${selected.scene_id}.png`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="label-eyebrow">{scenes.length} scenes</p>
        {imagesByScene.size > 0 && (
          <button onClick={downloadAll} className="btn-secondary !py-2 text-xs">
            <Download size={13} /> Download all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((scene, i) => (
          <SceneImageCard
            key={scene.id}
            index={i}
            projectId={projectId}
            scene={scene}
            variants={imagesByScene.get(scene.id) ?? []}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function SceneImageCard({
  index,
  projectId,
  scene,
  variants,
  onChanged,
}: {
  index: number;
  projectId: string;
  scene: Scene;
  variants: SceneImage[];
  onChanged: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const image = variants.find((v) => v.is_selected) ?? variants[0];

  async function regenerate() {
    setRegenerating(true);
    try {
      await api.generate.regenerateImage(projectId, scene.id);
      onChanged();
    } finally {
      setRegenerating(false);
    }
  }

  async function selectVariant(imageId: string) {
    if (imageId === image?.id) return;
    setSwitching(true);
    try {
      await api.generate.selectImageVariant(projectId, scene.id, imageId);
      onChanged();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="group glass-card overflow-hidden">
      <div className="relative aspect-video bg-white/[0.03]">
        {image ? (
          <img src={image.url} alt={scene.chapter_title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint">
            <ImageOff size={20} />
            <span className="text-[11px]">Not generated yet</span>
          </div>
        )}

        {(regenerating || switching) && (
          <div className="absolute inset-0 flex items-center justify-center bg-base/70 backdrop-blur-sm">
            <Spinner className="text-signal-300" />
          </div>
        )}

        {variants.length > 1 && (
          <div className="absolute left-0 right-0 top-2 flex justify-center gap-1.5">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => selectVariant(v.id)}
                className={`h-1.5 rounded-full transition-all ${
                  v.id === image?.id ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label="Choose this image variant"
              />
            ))}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] text-white/80">
            Scene {index + 1}
            {variants.length > 1 && <span className="text-white/50"> · {variants.length} options</span>}
          </span>
          <div className="flex gap-1">
            {image && (
              <a
                href={image.url}
                download
                target="_blank"
                rel="noopener"
                className="rounded-full bg-white/10 p-1.5 text-white backdrop-blur hover:bg-white/20"
              >
                <Download size={13} />
              </a>
            )}
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="rounded-full bg-white/10 p-1.5 text-white backdrop-blur hover:bg-white/20"
            >
              <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-xs font-medium text-ink">{scene.chapter_title || `Scene ${index + 1}`}</p>
      </div>
    </div>
  );
}
