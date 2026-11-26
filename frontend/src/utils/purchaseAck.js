export const transformPurchaseAckData = (purchaseAcknowledgments) => {
    return purchaseAcknowledgments.map(item => ({ ...item, status: getPurchaseAckStatus(item) }))
}

export const getPurchaseAckStatus = (purchaseAcknowledgment) => {
    const { status_counts } = purchaseAcknowledgment
    const { open, in_progress, done, cancelled } = status_counts
    const total = open + in_progress + done + cancelled
    const totalDone = done + cancelled
    const jobEntryDone = total === totalDone
    const repackCount = purchaseAcknowledgment.repacking_entry_count;
    const totalRepackCount = purchaseAcknowledgment.repack_supervisor_entry_count;
    const repackEntryDone = totalRepackCount > 0 && repackCount === totalRepackCount
    const hasGRN = purchaseAcknowledgment.has_grn;
    const purchaseEntryCreated = purchaseAcknowledgment.purchase_entry_id !== null;
    const purchaseOrderCreated = purchaseAcknowledgment.purchase_order_id !== null;
    const isJobEntryNeeded = purchaseAcknowledgment.is_job_entry_needed === true;

    if (!hasGRN) {
        return "grn_pending";
    }

    if (!isJobEntryNeeded && purchaseEntryCreated) {
        return "done";
    }

    if (purchaseEntryCreated && total == 0) {
        return "pe_created";
    }

    if (purchaseOrderCreated) {
        return "done";
    }

    if (total == 0) {
        return "grn_done";
    }

    if (repackEntryDone) {
        // return "repack_entry_done";
        return "done";
    }

    if (totalDone < total) {
        return "job_entry_in_progress";
    }

    if (repackCount >= 0 && repackCount < totalRepackCount) {
        return "repack_entry_in_progress";
    }

    if (jobEntryDone) {
        // Job worksheets are complete; if job entry was not required, treat as fully done
        // for table + status chart (only show job_entry_done when explicitly needed).
        if (purchaseAcknowledgment.is_job_entry_needed !== true) {
            return "done";
        }
        return "job_entry_done";
    }

    return "completed";
}