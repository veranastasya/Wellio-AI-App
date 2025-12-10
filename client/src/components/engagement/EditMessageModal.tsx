import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X } from "lucide-react";

interface EditMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialMessage: string;
  recipientName?: string;
  onSend: (message: string) => void;
  isSending?: boolean;
}

export function EditMessageModal({
  open,
  onOpenChange,
  title,
  initialMessage,
  recipientName = "Client",
  onSend,
  isSending = false,
}: EditMessageModalProps) {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Compose or edit your message before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              className="min-h-[140px] resize-none"
              data-testid="textarea-edit-message"
            />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm text-muted-foreground">
              Sending to: <strong className="text-foreground">{recipientName}</strong>
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-message"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()} data-testid="button-send-message">
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
