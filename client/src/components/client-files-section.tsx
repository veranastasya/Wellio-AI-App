import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download, Loader2, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ClientFile, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";

const t = COACH_UI_TRANSLATIONS;

const FILE_CATEGORIES = [
  { value: "general", labelKey: "general" as const },
  { value: "lab_results", labelKey: "labResults" as const },
  { value: "medical_reports", labelKey: "medicalReports" as const },
  { value: "nutrition_plans", labelKey: "nutritionPlans" as const },
  { value: "training_plans", labelKey: "trainingPlans" as const },
  { value: "other", labelKey: "otherCategory" as const },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryLabel(category: string, lang: SupportedLanguage): string {
  const cat = FILE_CATEGORIES.find(c => c.value === category);
  if (cat) return t.clientDetail[cat.labelKey][lang];
  return category;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return "img";
  if (fileType === "application/pdf") return "pdf";
  return "doc";
}

export function ClientFilesSection({ clientId, lang }: { clientId: string; lang: SupportedLanguage }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery<ClientFile[]>({
    queryKey: ['/api/clients', clientId, 'files'],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/files`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, notes }: { file: File; category: string; notes: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (notes) formData.append('notes', notes);

      const res = await fetch(`/api/clients/${clientId}/files/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to upload file');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
      toast({ title: t.clientDetail.fileUploaded[lang] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadCategory("general");
      setUploadNotes("");
    },
    onError: () => {
      toast({ title: t.clientDetail.error[lang], variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/clients/${clientId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'files'] });
      toast({ title: t.clientDetail.fileDeleted[lang] });
    },
  });

  const handleDownload = async (file: ClientFile) => {
    setDownloadingId(file.id);
    try {
      const res = await fetch(`/api/clients/${clientId}/files/${file.id}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get download URL');
      const { url } = await res.json();
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = file.fileName || '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast({ title: t.clientDetail.error[lang], variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, category: uploadCategory, notes: uploadNotes });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">{t.clientDetail.files[lang]}</h3>
        <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-file">
          <Upload className="w-4 h-4 mr-2" />
          {t.clientDetail.uploadFile[lang]}
        </Button>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">{t.clientDetail.noFiles[lang]}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.clientDetail.noFilesDesc[lang]}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="hover-elevate">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" data-testid={`text-filename-${file.id}`}>{file.fileName}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <Badge variant="secondary" className="text-xs">{getCategoryLabel(file.category || "general", lang)}</Badge>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {file.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{file.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    data-testid={`button-download-file-${file.id}`}
                  >
                    {downloadingId === file.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(file.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-file-${file.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.clientDetail.uploadFile[lang]}</DialogTitle>
            <DialogDescription>{t.clientDetail.noFilesDesc[lang]}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.clientDetail.files[lang]}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1"
                data-testid="input-file-upload"
              />
            </div>
            <div>
              <Label>{t.clientDetail.fileCategory[lang]}</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1" data-testid="select-file-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {t.clientDetail[cat.labelKey][lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.clientDetail.fileNotes[lang]}</Label>
              <Textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="mt-1"
                data-testid="input-file-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              {lang === "ru" ? "Отмена" : lang === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.clientDetail.uploadingFile[lang]}
                </>
              ) : (
                <>
                  {t.clientDetail.uploadFile[lang]}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
