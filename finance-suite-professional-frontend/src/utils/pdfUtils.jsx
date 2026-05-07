import { Slide, toast } from "react-toastify";

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const DOWNLOAD_TOAST_ID = "download-notification";

export const sanitizeDownloadFileName = (fileName, fallback = "download") => {
  const cleaned = String(fileName || "")
    .replace(INVALID_FILENAME_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return cleaned || fallback;
};

export const saveBytesToDownloads = async (bytes, fileName) => {
  const safeFileName = sanitizeDownloadFileName(fileName);
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const { downloadDir, join } = await import("@tauri-apps/api/path");
  const filePath = await join(await downloadDir(), safeFileName);
  await writeFile(filePath, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return { fileName: safeFileName, filePath };
};

export const savePdf = async (pdf, fileName) => {
  const safeFileName = sanitizeDownloadFileName(fileName);

  if (isTauri()) {
    try {
      const { filePath } = await saveBytesToDownloads(
        new Uint8Array(pdf.output("arraybuffer")),
        safeFileName
      );
      return filePath;
    } catch (e) {
      console.error("Tauri save failed, falling back:", e);
      pdf.save(safeFileName);
      return null;
    }
  } else {
    pdf.save(safeFileName);
    return null;
  }
};

export const revealInFolder = async (filePath) => {
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(filePath);
  } catch (e) {
    console.error("revealInFolder failed:", e);
    toast.error("Unable to show the downloaded file");
  }
};

export const showDownloadNotification = async (fileName, filePath) => {
  const content = () => (
    <div className="flex flex-col gap-1">
      <span>Downloaded: <strong>{fileName}</strong></span>
      {isTauri() && filePath && (
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await revealInFolder(filePath);
          }}
          className="text-xs text-blue-600 underline text-left cursor-pointer"
        >
          Show in Folder
        </button>
      )}
    </div>
  );

  const options = {
    toastId: DOWNLOAD_TOAST_ID,
    autoClose: 2000,
    closeOnClick: false,
    pauseOnFocusLoss: false,
    pauseOnHover: false,
    draggable: false,
    transition: Slide,
  };

  if (toast.isActive(DOWNLOAD_TOAST_ID)) {
    toast.update(DOWNLOAD_TOAST_ID, {
      render: content,
      type: "success",
      ...options,
    });
    return;
  }

  toast.success(content, options);
};
