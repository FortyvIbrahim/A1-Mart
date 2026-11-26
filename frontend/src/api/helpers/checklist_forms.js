import axiosInstance from "..";

export function getChecklistForms() {
  return axiosInstance.get("/checklist-forms").then((r) => r.data);
}

/** Per-day submission stats keyed by `DD/MM/YYYY` (see backend `local_date` display). */
export function getChecklistFormsWithSubmissionStats() {
  return axiosInstance
    .get("/checklist-forms/with-submission-stats")
    .then((r) => r.data);
}

/** Full per-day `answers` keyed by `DD/MM/YYYY` (see backend checklist-forms-with-submission-answers). */
export function getChecklistFormsWithSubmissionAnswers() {
  return axiosInstance
    .get("/checklist-forms/with-submission-answers")
    .then((r) => r.data);
}

export function getChecklistFormById(id) {
  return axiosInstance.get(`/checklist-forms/${id}`).then((r) => r.data);
}

export function createChecklistForm(payload) {
  return axiosInstance.post("/checklist-forms", payload).then((r) => r.data);
}

export function updateChecklistForm(id, payload) {
  return axiosInstance.put(`/checklist-forms/${id}`, payload).then((r) => r.data);
}

export function deleteChecklistForm(id) {
  return axiosInstance.delete(`/checklist-forms/${id}`).then((r) => r.data);
}
