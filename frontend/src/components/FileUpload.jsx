import React, { useEffect } from "react";

function FileUpload({ files = [], setFiles }) {
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => {
      const merged = [...prev, ...selected];
      return merged.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      );
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => {
      const merged = [...prev, ...dropped];
      return merged.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      );
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createPreview = (file) => {
    try {
      if (file.type &&
        (file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          file.type.startsWith("audio/"))) {
        return URL.createObjectURL(file);
      }
      return null;
    } catch (error) {
      console.warn('Error creating preview for file:', file.name, error);
      return null;
    }
  };

  const filesWithPreview = files.map((f) => ({
    file: f,
    preview: createPreview(f),
  }));

  useEffect(() => {
    return () => {
      filesWithPreview.forEach((fp) => {
        if (fp.preview) {
          try {
            URL.revokeObjectURL(fp.preview);
          } catch (error) {
            console.warn('Error revoking blob URL:', error);
          }
        }
      });
    };
  }, [filesWithPreview]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Your Files</h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
      >
        <p className="text-gray-500">Drag & Drop your files here</p>
        <p className="text-sm text-gray-400 mt-1">or click to browse</p>

        <input
          type="file"
          multiple
          className="hidden"
          id="fileInput"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.docx,.zip,.rar,.iso"
        />
        <label
          htmlFor="fileInput"
          className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          Select Files
        </label>
      </div>

      {filesWithPreview.length > 0 && (
        <ul className="mt-4 space-y-4 text-sm text-gray-700">
          {filesWithPreview.map((item, idx) => (
            <li
              key={item.file.name + "-" + item.file.size}
              className="flex items-center space-x-4 bg-gray-100 p-2 rounded"
            >
              {item.file.type && item.file.type.startsWith("image/") && (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              {item.file.type && item.file.type.startsWith("video/") && (
                <video
                  src={item.preview}
                  controls
                  className="w-24 h-16 rounded"
                />
              )}
              {item.file.type && item.file.type.startsWith("audio/") && (
                <audio src={item.preview} controls className="w-40" />
              )}
              {!(
                item.file.type &&
                (item.file.type.startsWith("image/") ||
                  item.file.type.startsWith("video/") ||
                  item.file.type.startsWith("audio/"))
              ) && (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-300 text-gray-700 rounded">
                  📄
                </div>
              )}
              <div className="flex-1 truncate">
                <p className="font-medium truncate">
                  {item.file.name || "Unnamed file"}
                </p>
                <p className="text-xs text-gray-500">
                  {item.file.size
                    ? (item.file.size / 1024).toFixed(1) + " KB"
                    : "0 KB"}
                </p>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="text-red-500 hover:text-red-700 text-lg"
                aria-label={`Remove ${item.file.name}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileUpload;
