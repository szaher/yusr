"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Trash2, Loader2 } from "lucide-react";

type AudioRecorderProps = {
  name: string;
  existingUrl?: string | null;
  translations: {
    record: string;
    stopRecording: string;
    reRecord: string;
    uploadFile: string;
    uploading: string;
    removeAudio: string;
    micPermission: string;
    unsupported: string;
  };
};

export function AudioRecorder({ name, existingUrl, translations: t }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "uploading" | "done">(existingUrl ? "done" : "idle");
  const [url, setUrl] = useState(existingUrl || "");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [previewUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setState("recorded");
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError(t.micPermission);
    }
  }, [t.micPermission]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const uploadBlob = useCallback(async (blob: Blob, filename: string) => {
    setState("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      const res = await fetch("/api/upload/audio", { method: "POST", body: fd });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Upload failed"); }
      const data = await res.json();
      setUrl(data.url);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setState(recordedBlob ? "recorded" : "idle");
    }
  }, [recordedBlob]);

  const handleUploadRecording = useCallback(() => {
    if (recordedBlob) uploadBlob(recordedBlob, `recording-${Date.now()}.webm`);
  }, [recordedBlob, uploadBlob]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.name);
  }, [uploadBlob]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setUrl("");
    setState("idle");
    setError(null);
  }, [previewUrl]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const supportsRecording = typeof window !== "undefined" && "MediaRecorder" in window;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      {state === "idle" && (
        <div className="flex gap-2">
          {supportsRecording ? (
            <Button type="button" variant="outline" size="sm" onClick={startRecording}>
              <Mic className="h-4 w-4 me-1" /> {t.record}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t.unsupported}</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 me-1" /> {t.uploadFile}
          </Button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
        </div>
      )}
      {state === "recording" && (
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-mono text-red-600 dark:text-red-400">{formatTime(duration)}</span>
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="h-3 w-3 me-1" /> {t.stopRecording}
          </Button>
        </div>
      )}
      {state === "recorded" && previewUrl && (
        <div className="space-y-2">
          <audio src={previewUrl} controls className="w-full h-10" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleUploadRecording}>
              <Upload className="h-4 w-4 me-1" /> {t.uploadFile}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset}>{t.reRecord}</Button>
          </div>
        </div>
      )}
      {state === "uploading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.uploading}
        </div>
      )}
      {state === "done" && url && (
        <div className="flex items-center gap-2">
          <audio src={url} controls className="flex-1 h-10" />
          <Button type="button" variant="ghost" size="icon-sm" onClick={reset} aria-label={t.removeAudio}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
