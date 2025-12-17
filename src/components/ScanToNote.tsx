import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, ScanText, X } from "lucide-react";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

interface ScanToNoteProps {
  onSaveNote: (text: string) => Promise<void>;
}

export const ScanToNote = ({ onSaveNote }: ScanToNoteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      processImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      setExtractedText(result.data.text.trim());
      
      if (!result.data.text.trim()) {
        toast.info("No text detected. Try a clearer image.");
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedText.trim()) {
      toast.error("No text to save");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveNote(extractedText);
      handleClose();
      toast.success("Note saved from scan");
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCapturedImage(null);
    setExtractedText("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerCapture = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <ScanText className="h-4 w-4" />
        Scan Page
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Page to Note</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!capturedImage ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm mb-4 text-center">
                  Take a photo of a page to extract text
                </p>
                <Button onClick={triggerCapture}>
                  <Camera className="h-4 w-4 mr-2" />
                  Open Camera
                </Button>
              </div>
            ) : (
              <>
                <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  <img
                    src={capturedImage}
                    alt="Captured page"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setCapturedImage(null);
                      setExtractedText("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isProcessing ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Processing... {progress}%
                    </p>
                    <div className="w-full h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Extracted Text (edit as needed)
                    </label>
                    <Textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      rows={6}
                      placeholder="No text extracted yet..."
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {capturedImage && !isProcessing && (
              <>
                <Button variant="outline" onClick={triggerCapture}>
                  Retake
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!extractedText.trim() || isSaving}
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save as Note
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
