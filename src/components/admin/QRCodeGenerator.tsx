import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeGeneratorProps {
  defaultUrl?: string;
}

export function QRCodeGenerator({ defaultUrl }: QRCodeGeneratorProps) {
  const [url, setUrl] = useState(defaultUrl || window.location.origin);
  const [size, setSize] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateAndDownload = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Suksess",
        description: "QR-kode lastet ned",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Feil",
        description: "Kunne ikke generere QR-kode",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Generer QR-kode</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="qr-url">URL</Label>
          <Input
            id="qr-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="qr-size">Størrelse (piksler)</Label>
          <Input
            id="qr-size"
            type="number"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            min={200}
            max={3000}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={generateAndDownload} 
          disabled={isGenerating || !url}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Genererer..." : "Last ned QR-kode (PNG)"}
        </Button>
      </div>
    </div>
  );
}
