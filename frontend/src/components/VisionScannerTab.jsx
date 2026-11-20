import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { InfoPill } from "./GlossaryModal";
import { CameraIcon, CautionIcon, UploadIcon } from "./Icons";

export function VisionScannerTab({ batches, onOpenGlossary, onDataMutated }) {
  const [presets, setPresets] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [useGemini, setUseGemini] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [localMetrics, setLocalMetrics] = useState(null);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.getVisionPresets().then((d) => setPresets(d.presets || [])).catch(() => {});
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

const startCamera = async () => {
    setCameraError("");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live camera requires a secure (HTTPS or localhost) connection. Use 'Upload Shelf / Crate Photo' instead."
      );
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }
      });
    } catch (err) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Allow camera access in your browser settings or use 'Upload Shelf / Crate Photo'."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError(
          "No camera was found. Connect a camera or use 'Upload Shelf / Crate Photo'."
        );
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setCameraError(
          "Camera is currently in use by another application or tab. Close it and try again."
        );
      } else {
        setCameraError(
          "Unable to access the camera. Check your browser permissions or use 'Upload Shelf / Crate Photo'."
        );
      }
    }
  };

  // Crops strictly to the center 58% x 64% reticle so room walls do not dilute produce pixels
  const drawReticleCrop = (sourceEl, targetCanvas, outW, outH) => {
    const srcW = sourceEl.videoWidth || sourceEl.naturalWidth || 640;
    const srcH = sourceEl.videoHeight || sourceEl.naturalHeight || 480;
    const cropW = Math.round(srcW * 0.58);
    const cropH = Math.round(srcH * 0.64);
    const cropX = Math.round((srcW - cropW) / 2);
    const cropY = Math.round((srcH - cropH) / 2);

    targetCanvas.width = outW;
    targetCanvas.height = outH;
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(sourceEl, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    return ctx;
  };

  const runLocalColorimetry = (sourceElement, cropToReticle = true) => {
    const start = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = cropToReticle
      ? drawReticleCrop(sourceElement, canvas, 120, 120)
      : (() => {
          canvas.width = 120;
          canvas.height = 120;
          const c = canvas.getContext("2d", { willReadFrequently: true });
          c.drawImage(sourceElement, 0, 0, 120, 120);
          return c;
        })();

    const { data } = ctx.getImageData(0, 0, 120, 120);
    let green = 0;
    let yellow = 0;
    let brown = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if ((r > 235 && g > 235 && b > 235) || (r < 20 && g < 20 && b < 20)) continue;
      count += 1;
      if (g > r * 1.05 && g > b * 1.1) green += 1;
      else if (r > 135 && g > 110 && b < 115) yellow += 1;
      else if (r < 145 && g < 110 && b < 85 && r >= g) brown += 1;
    }

    const denom = Math.max(1, count);
    const elapsedMs = Math.max(0.4, performance.now() - start);
    const metrics = {
      elapsedMs: elapsedMs.toFixed(1),
      greenPct: ((green / denom) * 100).toFixed(1),
      yellowPct: ((yellow / denom) * 100).toFixed(1),
      brownPct: ((brown / denom) * 100).toFixed(1),
    };
    setLocalMetrics(metrics);
    return metrics;
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    runLocalColorimetry(videoRef.current, true);

    const captureCanvas = document.createElement("canvas");
    drawReticleCrop(videoRef.current, captureCanvas, 480, 480);

    const dataUrl = captureCanvas.toDataURL("image/jpeg", 0.88);
    setPreviewUrl(dataUrl);
    stopCamera();

    captureCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "crate_capture.jpg", { type: "image/jpeg" });
      await submitImageToBackend(file);
    }, "image/jpeg", 0.88);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      runLocalColorimetry(img);
    };
    img.src = url;

    submitImageToBackend(file);
  };

  const submitImageToBackend = async (file) => {
    setAnalyzing(true);
    try {
      const res = await api.analyzeVision({
        file,
        batchCode: selectedBatch || undefined,
        useGemini,
      });
      setResult(res);
      if (res.batch_updated_in_db && onDataMutated) onDataMutated();
    } catch (err) {
      setCameraError("Vision analysis request failed. Verify backend port 8000.");
    } finally {
      setAnalyzing(false);
    }
  };

  const runPreset = async (presetId) => {
    stopCamera();
    setPreviewUrl("");
    setLocalMetrics(null);
    setAnalyzing(true);
    try {
      const res = await api.analyzeVision({
        presetId,
        batchCode: selectedBatch || undefined,
        useGemini: false,
      });
      setResult(res);
      if (res.batch_updated_in_db && onDataMutated) onDataMutated();
    } finally {
      setAnalyzing(false);
    }
  };

  const produceBatches = (batches || []).filter(
    (b) => b.category === "Fruits" || b.category === "Vegetables"
  );

  const stageTone = (stage) => {
    if (stage >= 5) return "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200";
    if (stage === 4) return "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200";
    return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200";
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[1.25rem] font-bold">
              Vision Ripeness &amp; Spoilage Scanner
            </h2>
            <InfoPill termKey="vision" onOpen={onOpenGlossary} label="Vision Scanner" />
          </div>
          <p className="text-[0.8125rem] text-stone-600 dark:text-stone-400 mt-0.5">
            Dual-mode optical inspector: sub-10ms zero-token client colorimetry + optional Gemini multimodal analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-[0.8125rem]"
          >
            <option value="">Auto-link urgent produce batch</option>
            {produceBatches.slice(0, 15).map((b) => (
              <option key={b.batch_code} value={b.batch_code}>
                {b.batch_code} — {b.product_name} ({b.store_name})
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-[0.8125rem] font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={useGemini}
              onChange={(e) => setUseGemini(e.target.checked)}
              className="accent-emerald-700"
            />
            <span>Gemini Multimodal Assist</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Input Channels */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[0.8125rem] font-semibold cursor-pointer"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Start Live Camera</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[0.8125rem] font-semibold cursor-pointer"
                >
                  <CameraIcon className="w-4 h-4" />
                  <span>Capture &amp; Classify Crate</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-[0.8125rem] font-semibold cursor-pointer"
                >
                  Stop Camera
                </button>
              </>
            )}

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-[0.8125rem] font-semibold cursor-pointer">
              <UploadIcon className="w-4 h-4" />
              <span>Upload Shelf / Crate Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {cameraError && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3 text-[0.8125rem] text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <CautionIcon className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Camera / Preview Viewport with Animated Reticle */}
          <div className="relative w-full h-[17rem] rounded-xl bg-stone-900 overflow-hidden flex items-center justify-center border border-stone-700">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="reticle-pulse w-[58%] h-[64%] border-2 border-emerald-400 rounded-2xl relative">
                    <span className="absolute -top-6 left-0 text-[0.6875rem] font-semibold tracking-wider text-emerald-300 uppercase">
                      Target Produce Crate Inside Frame
                    </span>
                  </div>
                </div>
              </>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Captured produce sample" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center px-6">
                <CameraIcon className="w-9 h-9 text-stone-500 mx-auto mb-2" />
                <p className="text-[0.875rem] text-stone-300 font-medium">
                  Live camera standby
                </p>
                <p className="text-[0.75rem] text-stone-400 mt-1">
                  Start webcam / rear mobile camera, upload a gallery photo, or click a presentation preset below.
                </p>
              </div>
            )}
          </div>

          {/* 1-Click Presentation Presets */}
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              1-Click Presentation Fail-Safe Presets
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(presets.length
                ? presets
                : [
                    { preset_id: "fresh_green", label: "Fresh Green (Stage 2)", grade: "PEAK FRESHNESS" },
                    { preset_id: "ripe_yellow", label: "Ripe Yellow (Stage 4)", grade: "CAUTION" },
                    { preset_id: "overripe_spotted", label: "Overripe Spotted (Stage 6)", grade: "CRITICAL" },
                  ]
              ).map((p) => (
                <button
                  key={p.preset_id}
                  type="button"
                  onClick={() => runPreset(p.preset_id)}
                  disabled={analyzing}
                  className="text-left p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-600 bg-white/70 dark:bg-stone-900/70 transition-colors cursor-pointer"
                >
                  <p className="text-[0.8125rem] font-semibold text-stone-900 dark:text-stone-100">
                    {p.label}
                  </p>
                  <p className="text-[0.6875rem] text-stone-500 dark:text-stone-400 mt-0.5">
                    {p.grade}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Optical Inspection Output */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Inspection Telemetry Result
            </p>

            {localMetrics && (
              <div className="mt-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-2 text-[0.75rem] text-sky-900 dark:text-sky-200 tabular-nums">
                Instant Client Colorimetry executed in <strong>{localMetrics.elapsedMs} ms</strong> (0 API tokens):
                Green {localMetrics.greenPct}% &middot; Yellow {localMetrics.yellowPct}% &middot; Brown {localMetrics.brownPct}%
              </div>
            )}

            {analyzing ? (
              <div className="py-16 text-center text-[0.875rem] text-stone-500">
                Running optical classification &amp; syncing PostgreSQL FEFO batch...
              </div>
            ) : result ? (
              <div className="mt-4 space-y-4">
                <div className={`rounded-xl border p-4 ${stageTone(result.ripeness_stage)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                      Ripeness Stage {result.ripeness_stage} / 7
                    </span>
                    {result.ripeness_stage >= 5 && <CautionIcon className="w-4 h-4" />}
                  </div>
                  <p className="font-display text-[1.25rem] font-bold mt-1">{result.grade}</p>
                  <p className="text-[0.75rem] mt-1 opacity-90">{result.engine}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 tabular-nums">
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
                    <p className="text-[0.6875rem] uppercase text-stone-500">Est. Usable Life</p>
                    <p className="font-display text-[1.375rem] font-bold mt-0.5">
                      {result.estimated_remaining_hours}h
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
                    <p className="text-[0.6875rem] uppercase text-stone-500">Suggested Markdown</p>
                    <p className="font-display text-[1.375rem] font-bold mt-0.5 text-orange-600">
                      {result.recommended_markdown_pct}%
                    </p>
                  </div>
                </div>

                {result.color_ratios && (
                  <div className="space-y-2">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500">
                      Pixel Colorimetry Breakdown
                    </p>
                    {[
                      { label: "Chlorophyll Green", val: result.color_ratios.green_pct ?? 0, bar: "bg-emerald-600" },
                      { label: "Ripe Yellow", val: result.color_ratios.yellow_pct ?? 0, bar: "bg-amber-500" },
                      { label: "Spotted Brown", val: result.color_ratios.brown_pct ?? result.color_ratios.brown_spot_pct ?? 0, bar: "bg-rose-600" },
                    ].map((row) => (
                      <div key={row.label} className="text-[0.75rem]">
                        <div className="flex justify-between tabular-nums mb-0.5">
                          <span>{row.label}</span>
                          <span className="font-semibold">{row.val}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                          <div className={`h-full ${row.bar}`} style={{ width: `${Math.min(100, Number(row.val) || 0)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3.5 text-[0.8125rem] leading-relaxed">
                  <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                    Recommended Action
                  </p>
                  <p className="text-stone-700 dark:text-stone-300">{result.recommendation}</p>
                  {result.gemini_inspection_note && (
                    <p className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-sky-800 dark:text-sky-300">
                      <strong>Gemini Multimodal Note:</strong> {result.gemini_inspection_note}
                    </p>
                  )}
                </div>

                {result.batch_updated_in_db && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-[0.75rem] text-emerald-800 dark:text-emerald-200">
                    PostgreSQL Batch <strong>{result.linked_batch_code}</strong> shelf life synced.
                    {result.ripeness_stage >= 5 && " Urgent markdown proposal queued in Smart Allocation Hub (M-09)."}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-[0.8125rem] text-stone-500 dark:text-stone-400">
                Select a 1-Click Preset or scan a produce crate to inspect ripeness stage, colorimetry ratios, and FEFO impact.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}