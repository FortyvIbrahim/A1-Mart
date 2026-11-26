import DeleteModal from "@/components/ui/delete-modal";
import { useState, useCallback } from "react";

function useDeleteModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "Confirm Delete",
    message:
      "Are you sure you want to delete this item? This action cannot be undone.",
    onDelete: null,
    onBack: null,
    isLoading: false,
  });

  const openDeleteModal = useCallback((config) => {
    const {
      title = "Confirm Delete",
      message = "Are you sure you want to delete this item? This action cannot be undone.",
      onDelete,
      onBack = null,
    } = config;

    if (!onDelete) {
      console.error("useDeleteModal: onDelete callback is required");
      return;
    }

    setModalConfig({
      title,
      message,
      onDelete,
      onBack,
      isLoading: false,
    });
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Reset config after a short delay to prevent flash
    setTimeout(() => {
      setModalConfig({
        title: "Confirm Delete",
        message:
          "Are you sure you want to delete this item? This action cannot be undone.",
        onDelete: null,
        onBack: null,
        isLoading: false,
      });
    }, 200);
  }, []);

  const setLoading = useCallback((loading) => {
    setModalConfig((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const DeleteModalComponent = useCallback(
    () => (
      <DeleteModal
        isOpen={isOpen}
        onClose={closeModal}
        onDelete={modalConfig.onDelete}
        onBack={modalConfig.onBack}
        title={modalConfig.title}
        message={modalConfig.message}
        isLoading={modalConfig.isLoading}
      />
    ),
    [isOpen, modalConfig, closeModal]
  );

  return {
    openDeleteModal,
    closeModal,
    setLoading,
    DeleteModalComponent,
    isOpen,
  };
}

export default useDeleteModal;
