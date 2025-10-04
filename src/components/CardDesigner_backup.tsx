import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Save, 
  Upload, 
  Download, 
  Printer, 
  FileImage, 
  FileText, 
  Trash2, 
  Plus,
  Type,
  Image as ImageIcon,
  Palette,
  Settings,
  RotateCcw,
  Eye,
  Copy,
  Grid3X3,
  Layout
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

interface ImageElement {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

interface CardDesign {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  texts: TextElement[];
  images: ImageElement[];
  createdAt: Date;
}

const CARD_TEMPLATES = [
  { name: 'Business Card', width: 350, height: 200 },
  { name: 'Greeting Card', width: 400, height: 300 },
  { name: 'Invitation Card', width: 450, height: 600 },
  { name: 'Name Tag', width: 300, height: 150 },
  { name: 'A4 Card (เต็มพื้นที่)', width: 1190, height: 680 }, // Optimized for 2x5 layout on A4
  { name: 'A4 Card (Medium)', width: 200, height: 280 },
  { name: 'Custom', width: 400, height: 300 }
];

// A4 paper dimensions in pixels (at 300 DPI)
const A4_DIMENSIONS = {
  width: 2480, // 8.27 inches * 300 DPI
  height: 3508 // 11.69 inches * 300 DPI
};

const FONT_FAMILIES = [
  'Inter', 'Noto Sans Thai', 'Mitr', 'Prompt', 'Kanit', 'Sarabun', 
  'Chakra Petch', 'K2D', 'Mali', 'Bai Jamjuree', 'IBM Plex Sans Thai', 
  'Sriracha', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana'
];

export function CardDesigner() {
  const [currentDesign, setCurrentDesign] = useState<CardDesign>({
    id: '1',
    name: 'A4 Full Card',
    width: 1190, // Optimized for A4 2x5 layout
    height: 680,
    backgroundColor: '#ffffff',
    texts: [],
    images: [],
    createdAt: new Date()
  });

  const [savedDesigns, setSavedDesigns] = useState<CardDesign[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showA4Layout, setShowA4Layout] = useState(true); // เริ่มต้นแสดง A4 Layout
  
  // A4 layout settings - Fixed 10 cards, 2 cols x 5 rows
  const [a4Settings, setA4Settings] = useState({
    cardCount: 10,
    rowGap: 15,
    columnGap: 15,
    marginTop: 30,
    marginLeft: 30,
    marginRight: 30,
    marginBottom: 30,
    forceLayout: true // Force 2x5 layout
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const a4CanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved designs on component mount
  useState(() => {
    const saved = localStorage.getItem('cardDesigns');
    if (saved) {
      setSavedDesigns(JSON.parse(saved));
    }
  });

  const saveDesign = () => {
    const designs = [...savedDesigns];
    const existingIndex = designs.findIndex(d => d.id === currentDesign.id);
    
    if (existingIndex >= 0) {
      designs[existingIndex] = currentDesign;
    } else {
      designs.push({ ...currentDesign, id: Date.now().toString() });
    }
    
    setSavedDesigns(designs);
    localStorage.setItem('cardDesigns', JSON.stringify(designs));
    toast.success('การ์ดถูกบันทึกแล้ว!');
  };

  const loadDesign = (design: CardDesign) => {
    setCurrentDesign(design);
    setSelectedElement(null);
    toast.success('โหลดการ์ดสำเร็จ!');
  };

  const deleteDesign = (designId: string) => {
    const designs = savedDesigns.filter(d => d.id !== designId);
    setSavedDesigns(designs);
    localStorage.setItem('cardDesigns', JSON.stringify(designs));
    toast.success('ลบการ์ดแล้ว');
  };

  const clearCanvas = () => {
    setCurrentDesign(prev => ({
      ...prev,
      texts: [],
      images: []
    }));
    setSelectedElement(null);
    toast.success('ล้างผืนผ้าใบแล้ว');
  };

  const addText = () => {
    if (currentDesign.texts.length >= 5) {
      toast.error('สามารถเพิ่มข้อความได้สูงสุด 5 ข้อความ');
      return;
    }

    const newText: TextElement = {
      id: Date.now().toString(),
      content: 'ข้อความใหม่',
      x: 50,
      y: 50,
      fontSize: 16,
      fontFamily: 'Inter',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };

    setCurrentDesign(prev => ({
      ...prev,
      texts: [...prev.texts, newText]
    }));
    setSelectedElement(newText.id);
  };

  const updateText = (id: string, updates: Partial<TextElement>) => {
    setCurrentDesign(prev => ({
      ...prev,
      texts: prev.texts.map(text => 
        text.id === id ? { ...text, ...updates } : text
      )
    }));
  };

  const deleteText = (id: string) => {
    setCurrentDesign(prev => ({
      ...prev,
      texts: prev.texts.filter(text => text.id !== id)
    }));
    setSelectedElement(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentDesign.images.length >= 3) {
      toast.error('สามารถเพิ่มรูปภาพได้สูงสุด 3 รูป');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: ImageElement = {
        id: Date.now().toString(),
        src: e.target?.result as string,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        opacity: 1
      };

      setCurrentDesign(prev => ({
        ...prev,
        images: [...prev.images, newImage]
      }));
      setSelectedElement(newImage.id);
    };
    reader.readAsDataURL(file);
  };

  const updateImage = (id: string, updates: Partial<ImageElement>) => {
    setCurrentDesign(prev => ({
      ...prev,
      images: prev.images.map(image => 
        image.id === id ? { ...image, ...updates } : image
      )
    }));
  };

  const deleteImage = (id: string) => {
    setCurrentDesign(prev => ({
      ...prev,
      images: prev.images.filter(image => image.id !== id)
    }));
    setSelectedElement(null);
  };

  const exportAsPNG = async () => {
    if (!canvasRef.current) return;
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: currentDesign.backgroundColor,
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `${currentDesign.name}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success('ส่งออกเป็น PNG สำเร็จ!');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งออก');
    }
  };

  const exportAsPDF = async () => {
    if (!canvasRef.current) return;
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: currentDesign.backgroundColor,
        scale: 2
      });
      
      const pdf = new jsPDF({
        orientation: currentDesign.width > currentDesign.height ? 'l' : 'p',
        unit: 'px',
        format: [currentDesign.width, currentDesign.height]
      });
      
      pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, currentDesign.width, currentDesign.height);
      pdf.save(`${currentDesign.name}.pdf`);
      
      toast.success('ส่งออกเป็น PDF สำเร็จ!');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งออก');
    }
  };

  const exportA4AsPDF = async () => {
    if (!a4CanvasRef.current) return;
    
    try {
      const canvas = await html2canvas(a4CanvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = 297; // A4 height in mm
      
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${currentDesign.name}_A4_Layout.pdf`);
      
      toast.success('ส่งออกเลย์เอาต์ A4 เป็น PDF สำเร็จ!');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งออก A4');
    }
  };

  const copyCardImage = async () => {
    if (!canvasRef.current) return;
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: currentDesign.backgroundColor,
        scale: 2
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success('คัดลอกภาพไปยังคลิปบอร์ดแล้ว!');
          } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${currentDesign.name}_copy.png`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('ดาวน์โหลดสำเนาภาพแล้ว!');
          }
        }
      }, 'image/png');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการคัดลอกภาพ');
    }
  };

  // Calculate A4 layout - Force 2x5 for 10 cards
  const calculateA4Layout = () => {
    const { cardCount, rowGap, columnGap, marginLeft, marginRight, marginTop, marginBottom, forceLayout } = a4Settings;
    
    if (forceLayout && cardCount === 10) {
      // Force 2 columns, 5 rows for optimal A4 usage
      const availableWidth = A4_DIMENSIONS.width - marginLeft - marginRight;
      const availableHeight = A4_DIMENSIONS.height - marginTop - marginBottom;
      
      // Calculate optimal card size to fill A4
      const optimalCardWidth = Math.floor((availableWidth - columnGap) / 2);
      const optimalCardHeight = Math.floor((availableHeight - 4 * rowGap) / 5);
      
      // Update card design to optimal size
      if (currentDesign.width !== optimalCardWidth || currentDesign.height !== optimalCardHeight) {
        setCurrentDesign(prev => ({
          ...prev,
          width: optimalCardWidth,
          height: optimalCardHeight
        }));
      }
      
      return { rows: 5, cols: 2, optimalCardWidth, optimalCardHeight };
    }
    
    // Fallback to original calculation
    const availableWidth = A4_DIMENSIONS.width - marginLeft - marginRight;
    const availableHeight = A4_DIMENSIONS.height - marginTop - marginBottom;
    
    let bestLayout = { rows: 1, cols: 1 };
    
    for (let cols = 1; cols <= 5; cols++) {
      const rows = Math.ceil(cardCount / cols);
      const totalCardWidth = cols * currentDesign.width + (cols - 1) * columnGap;
      const totalCardHeight = rows * currentDesign.height + (rows - 1) * rowGap;
      
      if (totalCardWidth <= availableWidth && totalCardHeight <= availableHeight) {
        bestLayout = { rows, cols };
      }
    }
    
    return bestLayout;
  };

  const printCard = () => {
    // Create a new window for printing with A4 layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate the same HTML structure as A4 canvas
    const availableWidth = A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight;
    const availableHeight = A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom;
    const cardWidth = Math.floor((availableWidth - a4Settings.columnGap) / 2);
    const cardHeight = Math.floor((availableHeight - 4 * a4Settings.rowGap) / 5);

    let cardsHTML = '';
    for (let index = 0; index < 10; index++) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = a4Settings.marginLeft + col * (cardWidth + a4Settings.columnGap);
      const y = a4Settings.marginTop + row * (cardHeight + a4Settings.rowGap);

      // Generate text elements HTML
      const textsHTML = currentDesign.texts.map(text => `
        <div style="
          position: absolute;
          left: ${(text.x / currentDesign.width) * cardWidth}px;
          top: ${(text.y / currentDesign.height) * cardHeight}px;
          font-size: ${(text.fontSize / currentDesign.width) * cardWidth}px;
          font-family: ${text.fontFamily};
          color: ${text.color};
          font-weight: ${text.fontWeight};
          font-style: ${text.fontStyle};
        ">${text.content}</div>
      `).join('');

      // Generate image elements HTML
      const imagesHTML = currentDesign.images.map(image => `
        <div style="
          position: absolute;
          left: ${(image.x / currentDesign.width) * cardWidth}px;
          top: ${(image.y / currentDesign.height) * cardHeight}px;
          width: ${(image.width / currentDesign.width) * cardWidth}px;
          height: ${(image.height / currentDesign.height) * cardHeight}px;
          opacity: ${image.opacity};
        ">
          <img src="${image.src}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      `).join('');

      cardsHTML += `
        <div style="
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${cardWidth}px;
          height: ${cardHeight}px;
          background-color: ${currentDesign.backgroundColor};
          border: 1px solid #ddd;
        ">
          ${textsHTML}
          ${imagesHTML}
        </div>
      `;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>พิมพ์การ์ด A4 - ${currentDesign.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
              padding: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: 'Inter', 'Noto Sans Thai', sans-serif;
            }
            .a4-container {
              position: relative;
              width: ${A4_DIMENSIONS.width}px;
              height: ${A4_DIMENSIONS.height}px;
              background: white;
            }
            .print-preview {
              transform: scale(0.283);
              transform-origin: top left;
            }
            @media print {
              .print-preview {
                transform: scale(1);
              }
              body {
                width: 210mm;
                height: 297mm;
              }
            }
            @media screen {
              body {
                padding: 20px;
                background: #f5f5f5;
              }
              .a4-container {
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-container print-preview">
            ${cardsHTML}
          </div>
          <script>
            // Auto print after page loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for images to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);

    toast.success('เริ่มการพิมพ์ A4 Layout...');
  };

  const selectedTextElement = selectedElement && currentDesign.texts.find(t => t.id === selectedElement);
  const selectedImageElement = selectedElement && currentDesign.images.find(i => i.id === selectedElement);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-80 sidebar-gradient border-r border-border custom-scrollbar overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Card Designer
            </h1>
            <p className="text-sm text-muted-foreground">สร้างการ์ดสวยงามได้อย่างง่ายดาย</p>
          </div>

          <Separator />

          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">เลือกเทมเพลต</Label>
            <Select 
              value={`${currentDesign.width}x${currentDesign.height}`}
              onValueChange={(value) => {
                const template = CARD_TEMPLATES.find(t => `${t.width}x${t.height}` === value);
                if (template) {
                  setCurrentDesign(prev => ({
                    ...prev,
                    width: template.width,
                    height: template.height
                  }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_TEMPLATES.map((template) => (
                  <SelectItem key={template.name} value={`${template.width}x${template.height}`}>
                    {template.name} ({template.width}×{template.height})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Card Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">การตั้งค่าการ์ด</Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">ชื่อการ์ด</Label>
                <Input
                  value={currentDesign.name}
                  onChange={(e) => setCurrentDesign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ชื่อการ์ด"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">ความกว้าง</Label>
                  <Input
                    type="number"
                    value={currentDesign.width}
                    onChange={(e) => setCurrentDesign(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ความสูง</Label>
                  <Input
                    type="number"
                    value={currentDesign.height}
                    onChange={(e) => setCurrentDesign(prev => ({ ...prev, height: parseInt(e.target.value) || 300 }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">สีพื้นหลัง</Label>
                <Input
                  type="color"
                  value={currentDesign.backgroundColor}
                  onChange={(e) => setCurrentDesign(prev => ({ ...prev, backgroundColor: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Text Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">ข้อความ ({currentDesign.texts.length}/5)</Label>
              <Button 
                size="sm" 
                onClick={addText}
                disabled={currentDesign.texts.length >= 5}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                เพิ่ม
              </Button>
            </div>

            {selectedTextElement && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">เนื้อหา</Label>
                    <Textarea
                      value={selectedTextElement.content}
                      onChange={(e) => updateText(selectedTextElement.id, { content: e.target.value })}
                      placeholder="ใส่ข้อความ..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ฟอนต์</Label>
                      <Select
                        value={selectedTextElement.fontFamily}
                        onValueChange={(value) => updateText(selectedTextElement.id, { fontFamily: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ขนาด</Label>
                      <Input
                        type="number"
                        value={selectedTextElement.fontSize}
                        onChange={(e) => updateText(selectedTextElement.id, { fontSize: parseInt(e.target.value) || 16 })}
                        min="8"
                        max="72"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">สี</Label>
                    <Input
                      type="color"
                      value={selectedTextElement.color}
                      onChange={(e) => updateText(selectedTextElement.id, { color: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedTextElement.fontWeight === 'bold' ? 'default' : 'outline'}
                      onClick={() => updateText(selectedTextElement.id, { 
                        fontWeight: selectedTextElement.fontWeight === 'bold' ? 'normal' : 'bold' 
                      })}
                    >
                      <Type className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTextElement.fontStyle === 'italic' ? 'default' : 'outline'}
                      onClick={() => updateText(selectedTextElement.id, { 
                        fontStyle: selectedTextElement.fontStyle === 'italic' ? 'normal' : 'italic' 
                      })}
                    >
                      <em>I</em>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteText(selectedTextElement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Image Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">รูปภาพ ({currentDesign.images.length}/3)</Label>
              <Button 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={currentDesign.images.length >= 3}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-1" />
                อัปโหลด
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {selectedImageElement && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ความกว้าง</Label>
                      <Input
                        type="number"
                        value={selectedImageElement.width}
                        onChange={(e) => updateImage(selectedImageElement.id, { width: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ความสูง</Label>
                      <Input
                        type="number"
                        value={selectedImageElement.height}
                        onChange={(e) => updateImage(selectedImageElement.id, { height: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">ความโปร่งใส: {Math.round(selectedImageElement.opacity * 100)}%</Label>
                    <Slider
                      value={[selectedImageElement.opacity]}
                      onValueChange={([value]) => updateImage(selectedImageElement.id, { opacity: value })}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteImage(selectedImageElement.id)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    ลบรูปภาพ
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* A4 Layout Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-blue-600">📄 เลย์เอาต์ A4 ({a4Settings.cardCount} ภาพ)</Label>
              <Button 
                size="sm" 
                variant={showA4Layout ? "default" : "outline"}
                onClick={() => setShowA4Layout(!showA4Layout)}
                className={showA4Layout ? "bg-blue-500 hover:bg-blue-600" : "border-blue-500 text-blue-600 hover:bg-blue-50"}
              >
                <Layout className="w-4 h-4 mr-1" />
                {showA4Layout ? 'ซ่อน A4' : 'แสดง A4'}
              </Button>
            </div>

            {showA4Layout && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 space-y-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      🎯 A4 เต็มพื้นที่ (2×5)
                    </Badge>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      10 ภาพคงที่
                    </Badge>
                  </div>
                  
                  <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                    <div className="text-xs font-bold text-green-800 mb-2">�️ โหมดพิมพ์เต็มพื้นที่:</div>
                    <div className="text-xs text-green-700">
                      • การ์ดขนาด: <span className="font-bold">{currentDesign.width} × {currentDesign.height} px</span><br/>
                      • จัดเรียง: <span className="font-bold">2 คอลัมน์ × 5 แถว = 10 ภาพ</span><br/>
                      • ใช้พื้นที่: <span className="font-bold">เกือบเต็ม A4</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-green-700">↕️ ระยะห่างแถว (px)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={a4Settings.rowGap}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          rowGap: parseInt(e.target.value) || 15 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-green-700">↔️ ระยะห่างคอลัมน์ (px)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={a4Settings.columnGap}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          columnGap: parseInt(e.target.value) || 15 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-green-700">⬅️ ขอบซ้าย (px)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginLeft}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginLeft: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-green-700">➡️ ขอบขวา (px)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginRight}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginRight: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-green-700">⬆️ ขอบบน (px)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginTop}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginTop: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-green-700">⬇️ ขอบล่าง (px)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginBottom}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginBottom: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={exportA4AsPDF} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <FileText className="w-4 h-4 mr-1" />
                      PDF A4
                    </Button>
                    <Button onClick={printCard} variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
                      <Printer className="w-4 h-4 mr-1" />
                      พิมพ์ A4
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={saveDesign} variant="default">
                <Save className="w-4 h-4 mr-1" />
                บันทึก
              </Button>
              <Button onClick={clearCanvas} variant="outline">
                <RotateCcw className="w-4 h-4 mr-1" />
                ล้าง
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copyCardImage} variant="secondary" size="sm">
                <Copy className="w-4 h-4 mr-1" />
                คัดลอก
              </Button>
              <Button onClick={exportAsPNG} variant="secondary" size="sm">
                <FileImage className="w-4 h-4 mr-1" />
                PNG
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={exportAsPDF} variant="secondary" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button onClick={printCard} variant="secondary" size="sm" className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300">
                <Printer className="w-4 h-4 mr-1" />
                Print A4
              </Button>
            </div>
          </div>

          <Separator />

          {/* Saved Designs */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">การ์ดที่บันทึก</Label>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {savedDesigns.map((design) => (
                  <Card key={design.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1" onClick={() => loadDesign(design)}>
                        <p className="text-sm font-medium">{design.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {design.width}×{design.height} • {design.texts.length} ข้อความ • {design.images.length} รูป
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDesign(design.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {savedDesigns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ยังไม่มีการ์ดที่บันทึก
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-8 canvas-area min-h-screen flex flex-col items-center justify-center">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Button
            variant={isPreviewMode ? "outline" : "default"}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? 'แก้ไข' : 'ตัวอย่าง'}
          </Button>
          <Badge variant="secondary" className="text-sm">
            {currentDesign.width} × {currentDesign.height} px
          </Badge>
          {showA4Layout && (
            <Badge variant="outline" className="text-sm bg-green-50 border-green-300 text-green-800">
              🎯 A4 เต็มพื้นที่: 2×5 = 10 ภาพ
            </Badge>
          )}
        </div>

        <div className="flex gap-6 items-start justify-center w-full">
          {/* Single Card Canvas */}
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-blue-700">🎨 การ์ดตัวอย่าง</h3>
            <div className="relative">
              <div 
                ref={canvasRef}
                className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-blue-200"
                style={{
                  width: `500px`, // Fixed larger size
                  height: `360px`,
                  backgroundColor: currentDesign.backgroundColor,
                }}
                onClick={() => setSelectedElement(null)}
              >
                {/* Container for scaled content */}
                <div
                  style={{
                    width: `${currentDesign.width}px`,
                    height: `${currentDesign.height}px`,
                    transform: `scale(${Math.min(500/currentDesign.width, 360/currentDesign.height)})`,
                    transformOrigin: 'top left',
                    position: 'absolute'
                  }}
                >
                  {/* Text Elements */}
                  {currentDesign.texts.map((text) => (
                    <div
                      key={text.id}
                      className={`draggable-text ${selectedElement === text.id ? 'selected' : ''} ${
                        isPreviewMode ? 'pointer-events-none border-transparent' : ''
                      }`}
                      style={{
                        left: `${text.x}px`,
                        top: `${text.y}px`,
                        fontSize: `${text.fontSize}px`,
                        fontFamily: text.fontFamily,
                        color: text.color,
                        fontWeight: text.fontWeight,
                        fontStyle: text.fontStyle,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPreviewMode) setSelectedElement(text.id);
                      }}
                    >
                      {text.content}
                    </div>
                  ))}

                  {/* Image Elements */}
                  {currentDesign.images.map((image) => (
                    <div
                      key={image.id}
                      className={`draggable-image ${selectedElement === image.id ? 'selected' : ''} ${
                        isPreviewMode ? 'pointer-events-none border-transparent' : ''
                      }`}
                      style={{
                        left: `${image.x}px`,
                        top: `${image.y}px`,
                        width: `${image.width}px`,
                        height: `${image.height}px`,
                        opacity: image.opacity,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPreviewMode) setSelectedElement(image.id);
                      }}
                    >
                      <img 
                        src={image.src} 
                        alt="Card element" 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                      
                      {/* Resize Handles - Only show when selected and not in preview mode */}
                      {selectedElement === image.id && !isPreviewMode && (
                        <>
                          <div
                            className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-background rounded-full cursor-nw-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // Handle resize logic here
                            }}
                          />
                          <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-background rounded-full cursor-se-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // Handle resize logic here
                            }}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  {/* Empty State */}
                  {currentDesign.texts.length === 0 && currentDesign.images.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Palette className="w-12 h-12 mx-auto opacity-50" />
                        <p className="text-lg font-medium">เริ่มสร้างการ์ดของคุณ</p>
                        <p className="text-sm">เพิ่มข้อความหรือรูปภาพเพื่อเริ่มต้น</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Card info */}
              <div className="mt-4 text-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  📐 {currentDesign.width} × {currentDesign.height} px
                </Badge>
              </div>
            </div>
          </div>
              {/* Text Elements */}
              {currentDesign.texts.map((text) => (
                <div
                  key={text.id}
                  className={`draggable-text ${selectedElement === text.id ? 'selected' : ''} ${
                    isPreviewMode ? 'pointer-events-none border-transparent' : ''
                  }`}
                  style={{
                    left: `${text.x}px`,
                    top: `${text.y}px`,
                    fontSize: `${text.fontSize}px`,
                    fontFamily: text.fontFamily,
                    color: text.color,
                    fontWeight: text.fontWeight,
                    fontStyle: text.fontStyle,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPreviewMode) setSelectedElement(text.id);
                  }}
                  onMouseDown={(e) => {
                    if (isPreviewMode) return;
                    
                    const startX = e.clientX - text.x;
                    const startY = e.clientY - text.y;
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      updateText(text.id, {
                        x: e.clientX - startX,
                        y: e.clientY - startY
                      });
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  {text.content}
                </div>
              ))}

              {/* Image Elements */}
              {currentDesign.images.map((image) => (
                <div
                  key={image.id}
                  className={`draggable-image ${selectedElement === image.id ? 'selected' : ''} ${
                    isPreviewMode ? 'pointer-events-none border-transparent' : ''
                  }`}
                  style={{
                    left: `${image.x}px`,
                    top: `${image.y}px`,
                    width: `${image.width}px`,
                    height: `${image.height}px`,
                    opacity: image.opacity,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPreviewMode) setSelectedElement(image.id);
                  }}
                  onMouseDown={(e) => {
                    if (isPreviewMode) return;
                    
                    // Only handle drag if clicking directly on the image container, not resize handles
                    if (e.target !== e.currentTarget && !e.currentTarget.querySelector('img')?.contains(e.target as Node)) return;
                    
                    e.preventDefault();
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    
                    const startX = e.clientX - rect.left - image.x;
                    const startY = e.clientY - rect.top - image.y;
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      const newX = Math.max(0, Math.min(currentDesign.width - image.width, e.clientX - rect.left - startX));
                      const newY = Math.max(0, Math.min(currentDesign.height - image.height, e.clientY - rect.top - startY));
                      
                      updateImage(image.id, {
                        x: newX,
                        y: newY
                      });
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <img 
                    src={image.src} 
                    alt="Card element" 
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  
                  {/* Resize Handles - Only show when selected and not in preview mode */}
                  {selectedElement === image.id && !isPreviewMode && (
                    <>
                      {/* Corner resize handles */}
                      <div
                        className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-background rounded-full cursor-nw-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startWidth = image.width;
                          const startHeight = image.height;
                          const startPosX = image.x;
                          const startPosY = image.y;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = startX - e.clientX;
                            const deltaY = startY - e.clientY;
                            const newWidth = Math.max(20, startWidth + deltaX);
                            const newHeight = Math.max(20, startHeight + deltaY);
                            
                            updateImage(image.id, {
                              width: newWidth,
                              height: newHeight,
                              x: startPosX - (newWidth - startWidth),
                              y: startPosY - (newHeight - startHeight)
                            });
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                      
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-background rounded-full cursor-se-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startWidth = image.width;
                          const startHeight = image.height;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const deltaX = e.clientX - startX;
                            const deltaY = e.clientY - startY;
                            
                            updateImage(image.id, {
                              width: Math.max(20, startWidth + deltaX),
                              height: Math.max(20, startHeight + deltaY)
                            });
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    </>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {currentDesign.texts.length === 0 && currentDesign.images.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Palette className="w-12 h-12 mx-auto opacity-50" />
                    <p className="text-lg font-medium">เริ่มสร้างการ์ดของคุณ</p>
                    <p className="text-sm">เพิ่มข้อความหรือรูปภาพเพื่อเริ่มต้น</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* A4 Layout Canvas - Full Page Preview */}
          {showA4Layout && (
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4 text-green-700">🖨️ A4 เต็มพื้นที่ (10 ภาพ)</h3>
              <div className="border-4 border-green-300 shadow-2xl bg-white rounded-xl overflow-hidden" 
                   style={{ width: '560px', height: '396px' }}>
                <div 
                  ref={a4CanvasRef}
                  className="relative bg-white w-full h-full"
                  style={{
                    width: `${A4_DIMENSIONS.width}px`,
                    height: `${A4_DIMENSIONS.height}px`,
                    transform: 'scale(0.226)', // Larger scale for better visibility
                    transformOrigin: 'top left'
                  }}
                >
                  {/* Render exactly 10 cards in 2x5 layout */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const col = index % 2; // Force 2 columns
                    const row = Math.floor(index / 2); // 5 rows
                    
                    // Calculate optimal positions to fill A4
                    const availableWidth = A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight;
                    const availableHeight = A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom;
                    
                    const cardWidth = Math.floor((availableWidth - a4Settings.columnGap) / 2);
                    const cardHeight = Math.floor((availableHeight - 4 * a4Settings.rowGap) / 5);
                    
                    const x = a4Settings.marginLeft + col * (cardWidth + a4Settings.columnGap);
                    const y = a4Settings.marginTop + row * (cardHeight + a4Settings.rowGap);

                    return (
                      <div
                        key={index}
                        className="absolute border-2 border-green-200 shadow-sm"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          width: `${cardWidth}px`,
                          height: `${cardHeight}px`,
                          backgroundColor: currentDesign.backgroundColor,
                        }}
                      >
                        {/* Render all text elements scaled to card */}
                        {currentDesign.texts.map((text) => (
                          <div
                            key={`${index}-text-${text.id}`}
                            className="absolute"
                            style={{
                              left: `${(text.x / currentDesign.width) * cardWidth}px`,
                              top: `${(text.y / currentDesign.height) * cardHeight}px`,
                              fontSize: `${(text.fontSize / currentDesign.width) * cardWidth}px`,
                              fontFamily: text.fontFamily,
                              color: text.color,
                              fontWeight: text.fontWeight,
                              fontStyle: text.fontStyle,
                              pointerEvents: 'none'
                            }}
                          >
                            {text.content}
                          </div>
                        ))}

                        {/* Render all image elements scaled to card */}
                        {currentDesign.images.map((image) => (
                          <div
                            key={`${index}-image-${image.id}`}
                            className="absolute"
                            style={{
                              left: `${(image.x / currentDesign.width) * cardWidth}px`,
                              top: `${(image.y / currentDesign.height) * cardHeight}px`,
                              width: `${(image.width / currentDesign.width) * cardWidth}px`,
                              height: `${(image.height / currentDesign.height) * cardHeight}px`,
                              opacity: image.opacity,
                              pointerEvents: 'none'
                            }}
                          >
                            <img 
                              src={image.src} 
                              alt="Card element" 
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        ))}

                        {/* Card number badge */}
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                          {index + 1}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* A4 margins guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-green-400 pointer-events-none" 
                       style={{
                         margin: `${a4Settings.marginTop}px ${a4Settings.marginRight}px ${a4Settings.marginBottom}px ${a4Settings.marginLeft}px`
                       }} 
                  />
                  
                  {/* A4 Paper outline */}
                  <div className="absolute inset-0 border-4 border-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="mt-4 text-center">
                <Badge className="bg-green-100 text-green-800 border-green-300 text-sm px-4 py-2">
                  🎯 พิมพ์ได้ 10 ภาพเต็ม A4 ในหน้าเดียว
                </Badge>
                <p className="text-sm text-green-600 mt-2 font-medium">
                  การ์ดขนาด: {Math.floor((A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight - a4Settings.columnGap) / 2)} × {Math.floor((A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom - 4 * a4Settings.rowGap) / 5)} px<br/>
                  เลย์เอาต์: 2 คอลัมน์ × 5 แถว = 10 ภาพพอดี
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
                  {/* Render exactly 10 cards in 2x5 layout */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const col = index % 2; // Force 2 columns
                    const row = Math.floor(index / 2); // 5 rows
                    
                    // Calculate optimal positions to fill A4
                    const availableWidth = A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight;
                    const availableHeight = A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom;
                    
                    const cardWidth = Math.floor((availableWidth - a4Settings.columnGap) / 2);
                    const cardHeight = Math.floor((availableHeight - 4 * a4Settings.rowGap) / 5);
                    
                    const x = a4Settings.marginLeft + col * (cardWidth + a4Settings.columnGap);
                    const y = a4Settings.marginTop + row * (cardHeight + a4Settings.rowGap);
                    
                    return (
                      <div
                        key={index}
                        className="absolute border-2 border-green-200 shadow-sm"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          width: `${cardWidth}px`,
                          height: `${cardHeight}px`,
                          backgroundColor: currentDesign.backgroundColor,
                        }}
                      >
                        {/* Render all text elements scaled to card */}
                        {currentDesign.texts.map((text) => (
                          <div
                            key={`${index}-text-${text.id}`}
                            className="absolute"
                            style={{
                              left: `${(text.x / currentDesign.width) * cardWidth}px`,
                              top: `${(text.y / currentDesign.height) * cardHeight}px`,
                              fontSize: `${(text.fontSize / currentDesign.width) * cardWidth}px`,
                              fontFamily: text.fontFamily,
                              color: text.color,
                              fontWeight: text.fontWeight,
                              fontStyle: text.fontStyle,
                              pointerEvents: 'none'
                            }}
                          >
                            {text.content}
                          </div>
                        ))}

                        {/* Render all image elements scaled to card */}
                        {currentDesign.images.map((image) => (
                          <div
                            key={`${index}-image-${image.id}`}
                            className="absolute"
                            style={{
                              left: `${(image.x / currentDesign.width) * cardWidth}px`,
                              top: `${(image.y / currentDesign.height) * cardHeight}px`,
                              width: `${(image.width / currentDesign.width) * cardWidth}px`,
                              height: `${(image.height / currentDesign.height) * cardHeight}px`,
                              opacity: image.opacity,
                              pointerEvents: 'none'
                            }}
                          >
                            <img 
                              src={image.src} 
                              alt="Card element" 
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        ))}

                        {/* Card number badge */}
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                          {index + 1}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* A4 margins guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-green-400 pointer-events-none" 
                       style={{
                         margin: `${a4Settings.marginTop}px ${a4Settings.marginRight}px ${a4Settings.marginBottom}px ${a4Settings.marginLeft}px`
                       }} 
                  />
                  
                  {/* A4 Paper outline */}
                  <div className="absolute inset-0 border-4 border-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  🎯 พิมพ์ได้ 10 ภาพเต็ม A4 ในหน้าเดียว
                </Badge>
                <p className="text-xs text-green-600 mt-2 font-medium">
                  การ์ดขนาด: {Math.floor((A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight - a4Settings.columnGap) / 2)} × {Math.floor((A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom - 4 * a4Settings.rowGap) / 5)} px<br/>
                  เลย์เอาต์: 2 คอลัมน์ × 5 แถว = 10 ภาพพอดี
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}