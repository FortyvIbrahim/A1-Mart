import { uploadAsset } from "@/api/helpers/assets";
import {
  asQuestionArray,
  getQuestionKey,
  isMediaQuestion,
} from "@/utils/checklistSubmissionPayload";

function toFile(blobOrFile, name) {
  if (!blobOrFile) return null;
  if (blobOrFile instanceof File) return blobOrFile;
  if (blobOrFile instanceof Blob) {
    return new File([blobOrFile], name || "upload.bin", { type: blobOrFile.type });
  }
  return null;
}

async function uploadOne(val, label, folder, assetType) {
  if (!val) return null;
  if (typeof val === "string") return val;
  const file = val instanceof File ? val : toFile(val, label);
  if (!file) return null;
  const res = await uploadAsset(file, String(label).slice(0, 40), folder, assetType);
  if (res.code !== 200) throw new Error(res.message || "Upload failed");
  return res.remoteUrl;
}

/**
 * Uploads File/Blob fields for media questions; returns map `resolvedUrlsByKey[key] = { file?, image?, video?, audio? }`.
 */
export async function resolveMediaUploadsForSubmission(questions, answersMap) {
  const resolvedUrlsByKey = {};
  const qList = asQuestionArray(questions);

  for (let i = 0; i < qList.length; i++) {
    const q = qList[i];
    if (!isMediaQuestion(q)) continue;
    const key = getQuestionKey(q, i);
    const row = answersMap[key] ?? {};
    const bucket = {};

    if (q.take_image) {
      bucket.image = await uploadOne(row.image, `q${q.id}-img`, "checklist", "image");
    }
    if (q.take_video) {
      bucket.video = await uploadOne(row.video, `q${q.id}-vid`, "checklist", "open");
    }
    if (q.record_audio) {
      const audioFile = row.audio instanceof File || row.audio instanceof Blob
        ? row.audio
        : null;
      bucket.audio = await uploadOne(
        audioFile ?? row.audio,
        `q${q.id}-aud`,
        "checklist",
        "open"
      );
    }
    if (!q.take_image && !q.take_video && !q.record_audio) {
      bucket.file = await uploadOne(row.file, `q${q.id}-file`, "checklist", "open");
    }

    const hasAny = Object.values(bucket).some(Boolean);
    if (hasAny) resolvedUrlsByKey[key] = bucket;
  }

  return resolvedUrlsByKey;
}
