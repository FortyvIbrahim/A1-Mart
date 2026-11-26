/** Map GET /checklist-forms/:id response into Formik shape used by the form UI. */
export function mapChecklistFormFromApi(form) {
  if (!form) return null;
  return {
    title: form.title ?? "",
    designation_id: form.report_to_designation_ids ?? [],
    questions: (Array.isArray(form.questions) ? form.questions : []).map(
      (q, i) => ({
        ...q,
        question: q.title ?? q.question ?? "",
        _id: q._id ?? `question-${q.id ?? i}-${i}`,
      })
    ),
  };
}

function nullIfEmptyTime(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Map form values to POST/PUT body for /checklist-forms */
export function mapChecklistFormToApi(values) {
  const ids = (values.designation_id ?? [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  return {
    title: values.title,
    report_to_designation_ids: ids,
    questions: (values.questions ?? []).map((q, index) => ({
      sort_order: q.sort_order ?? index + 1,
      /** Prefer `question` — UI edits that field; `title` from API remains stale after modal edits. */
      title: (q.question ?? q.title ?? "").trim(),
      description: q.description ?? null,
      question_type: q.question_type,
      fill_at_from: nullIfEmptyTime(q.fill_at_from),
      fill_at_to: nullIfEmptyTime(q.fill_at_to),
      is_required: Boolean(q.is_required),
      record_audio: Boolean(q.record_audio),
      take_image: Boolean(q.take_image),
      is_image_optional: Boolean(q.is_image_optional),
      take_video: Boolean(q.take_video),
      is_video_optional: Boolean(q.is_video_optional),
      allow_comment: Boolean(q.allow_comment),
      is_comment_optional: Boolean(q.is_comment_optional),
    })),
  };
}
