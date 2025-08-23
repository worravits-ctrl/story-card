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
  Eye
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
  { name: 'Custom', width: 400, height: 300 }
];

const FONT_FAMILIES = [
  'Inter', 'Noto Sans Thai', 'Mitr', 'Prompt', 'Kanit', 'Sarabun', 
  'Chakra Petch', 'K2D', 'Mali', 'Bai Jamjuree', 'IBM Plex Sans Thai', 
  'Sriracha', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana'
];

export function CardDesigner() {
  const [currentDesign, setCurrentDesign] = useState<CardDesign>({
    id: '1',
    name: 'Untitled Card',
    width: 400,
    height: 300,
    backgroundColor: '#ffffff',
    texts: [],
    images: [],
    createdAt: new Date()
  });

  const [savedDesigns, setSavedDesigns] = useState<CardDesign[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  const printCard = () => {
    window.print();
    toast.success('เริ่มการพิมพ์...');
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
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={exportAsPNG} variant="secondary" size="sm">
                <FileImage className="w-4 h-4 mr-1" />
                PNG
              </Button>
              <Button onClick={exportAsPDF} variant="secondary" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button onClick={printCard} variant="secondary" size="sm">
                <Printer className="w-4 h-4 mr-1" />
                Print
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
        <div className="mb-6 flex items-center gap-4">
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
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className="relative shadow-float rounded-lg overflow-hidden"
          style={{
            width: `${currentDesign.width}px`,
            height: `${currentDesign.height}px`,
            backgroundColor: currentDesign.backgroundColor,
          }}
          onClick={() => setSelectedElement(null)}
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
                if (isPreviewMode || e.target !== e.currentTarget) return;
                
                const startX = e.clientX - image.x;
                const startY = e.clientY - image.y;
                
                const handleMouseMove = (e: MouseEvent) => {
                  updateImage(image.id, {
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
                    className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-background rounded-full cursor-ne-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = image.width;
                      const startHeight = image.height;
                      const startPosY = image.y;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX;
                        const deltaY = startY - e.clientY;
                        const newWidth = Math.max(20, startWidth + deltaX);
                        const newHeight = Math.max(20, startHeight + deltaY);
                        
                        updateImage(image.id, {
                          width: newWidth,
                          height: newHeight,
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
                    className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-background rounded-full cursor-sw-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = image.width;
                      const startHeight = image.height;
                      const startPosX = image.x;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = startX - e.clientX;
                        const deltaY = e.clientY - startY;
                        const newWidth = Math.max(20, startWidth + deltaX);
                        const newHeight = Math.max(20, startHeight + deltaY);
                        
                        updateImage(image.id, {
                          width: newWidth,
                          height: newHeight,
                          x: startPosX - (newWidth - startWidth)
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
                  
                  {/* Edge resize handles */}
                  <div
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-primary border border-background rounded cursor-n-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startY = e.clientY;
                      const startHeight = image.height;
                      const startPosY = image.y;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaY = startY - e.clientY;
                        const newHeight = Math.max(20, startHeight + deltaY);
                        
                        updateImage(image.id, {
                          height: newHeight,
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
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-primary border border-background rounded cursor-s-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startY = e.clientY;
                      const startHeight = image.height;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaY = e.clientY - startY;
                        
                        updateImage(image.id, {
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
                  
                  <div
                    className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-primary border border-background rounded cursor-w-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startWidth = image.width;
                      const startPosX = image.x;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = startX - e.clientX;
                        const newWidth = Math.max(20, startWidth + deltaX);
                        
                        updateImage(image.id, {
                          width: newWidth,
                          x: startPosX - (newWidth - startWidth)
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
                    className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-primary border border-background rounded cursor-e-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startWidth = image.width;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX;
                        
                        updateImage(image.id, {
                          width: Math.max(20, startWidth + deltaX)
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
    </div>
  );
}