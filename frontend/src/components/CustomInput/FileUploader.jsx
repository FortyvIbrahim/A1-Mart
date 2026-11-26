import { useFormikContext } from "formik";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./styles.module.css";

function FileUploader({ name, accept, maxSize = 5242880, value, disabled = false }) {
  const { setFieldValue } = useFormikContext();

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (disabled) return;
      setFieldValue(name, acceptedFiles[0]);
    },
    [name, setFieldValue, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: !!disabled,
  });

  const getName = () => {
    if (typeof value === "string") {
      return value
        ?.replace(
          "https://a1-stores-bucket.s3.ap-south-1.amazonaws.com/brands/",
          ""
        )
        .replace(/\?.*$/, "");
    }

    return value?.name ?? "-";
  };

  return (
    <div className={styles.fileUpload}>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${
          isDragActive ? styles.dragActive : ""
        }`}
        style={
          disabled
            ? { opacity: 0.65, cursor: "not-allowed" }
            : undefined
        }
      >
        <input {...getInputProps()} accept={accept} />
        {value ? (
          <div className={styles.fileInfo}>
            <i className="fa fa-file" />
            <p className={styles.fileNameStyle}>{getName()}</p>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                setFieldValue(name, null);
              }}
              className={styles.removeFile}
            >
              <i className="fa fa-times" />
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <i className="fa fa-cloud-upload" />
            <p className={styles.fileNameStyle} style={{ textAlign: "center" }}>
              {isDragActive
                ? "Drop the file here"
                : "Drag & drop a file here, or click to select"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUploader;
