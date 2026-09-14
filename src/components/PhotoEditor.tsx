import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSaveMember } from '../hooks/queries';
import { Avatar } from './Avatar';
import { useToast } from './Toast';
import { Sheet } from './Sheet';
import { Button } from './ui';
import { CameraIcon, ImageIcon } from './icons';
import { cropAndResize } from '../lib/image';
import { errorMessage } from '../lib/errors';
import { PHOTO_BUCKET, supabase } from '../lib/supabase';
import type { Member } from '../types/db';

/**
 * Admin photo upload: camera or gallery → square crop → 400×400 WebP in the
 * browser → private bucket. The old file is deleted after a successful swap.
 */
export function PhotoEditor({ member }: { member: Member }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const saveMember = useSaveMember();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source);
  }, [source]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast(t('admin:photo.notImage'), 'error');
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource(URL.createObjectURL(file));
  };

  const removeFile = async (path: string | null) => {
    if (!path) return;
    // Best effort: an orphan file only costs a few KB.
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    queryClient.removeQueries({ queryKey: ['photo-url', path] });
  };

  const upload = async () => {
    if (!source || !area) return;
    setBusy(true);
    try {
      const { blob, extension, contentType } = await cropAndResize(source, area);
      const path = `${member.id}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { cacheControl: '31536000', contentType, upsert: false });
      if (error) throw error;
      const previous = member.photo_path;
      await saveMember.mutateAsync({ id: member.id, values: { photo_path: path } });
      await removeFile(previous);
      toast(t('admin:photo.saved'));
      setSource(null);
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const previous = member.photo_path;
      await saveMember.mutateAsync({ id: member.id, values: { photo_path: null } });
      await removeFile(previous);
      toast(t('admin:photo.removed'));
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <Avatar name={member.name} photoPath={member.photo_path} size="xl" />
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        <Button variant="secondary" size="sm" onClick={() => cameraRef.current?.click()} disabled={busy}>
          <CameraIcon className="h-4 w-4" />
          {t('admin:photo.camera')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => galleryRef.current?.click()} disabled={busy}>
          <ImageIcon className="h-4 w-4" />
          {t('admin:photo.gallery')}
        </Button>
        {member.photo_path && (
          <Button variant="ghost" size="sm" className="text-danger" onClick={remove} loading={busy && !source}>
            {t('admin:photo.remove')}
          </Button>
        )}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <Sheet
        open={Boolean(source)}
        onClose={() => !busy && setSource(null)}
        title={t('admin:photo.cropTitle')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setSource(null)} disabled={busy}>
              {t('common:actions.cancel')}
            </Button>
            <Button block onClick={upload} loading={busy} disabled={!area}>
              {t('common:actions.save')}
            </Button>
          </div>
        }
      >
        {source && (
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900">
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                objectFit="cover"
              />
            </div>
            <label className="block text-sm font-semibold">
              {t('admin:photo.zoom')}
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-2 w-full accent-[rgb(var(--primary))]"
              />
            </label>
            <p className="text-xs text-muted-foreground">{t('admin:photo.hint')}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
