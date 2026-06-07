import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadPhoto } from "@/services/apiServer";

const Upload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a photo first.");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setError("");

    try {
      await uploadPhoto(selectedFile);
      setMessage("Uploaded photo");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 pt-0">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Upload photo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose an image file and send it to the S3 bucket.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg"
            disabled={isUploading}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setMessage("");
              setError("");
            }}
          />

          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              {selectedFile.name} -{" "}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
          >
            <UploadIcon />
            {isUploading ? "Uploading..." : "Upload photo"}
          </Button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Upload;
