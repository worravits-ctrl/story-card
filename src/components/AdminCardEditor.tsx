import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Save, 
  X,
  Type,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  Plus,
  Trash2,
  Settings,
  Download,
  Cloud,
  HardDrive,
  FileDown
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { updateCardDesign, updateCardDesignAsAdmin, type CardDesign, type TextElement, type ImageElement } from '@/lib/supabase'

interface AdminCardEditorProps {
  design: CardDesign
  isOpen: boolean
  onClose: () => void
  onSave: (updatedDesign: CardDesign) => void
}

const FONTS = [
  { name: 'Sarabun', value: 'Sarabun, sans-serif' },
  { name: 'Prompt', value: 'Prompt, sans-serif' },
  { name: 'Noto Sans Thai', value: 'Noto Sans Thai, sans-serif' },
  { name: 'Kanit', value: 'Kanit, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
]

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f87171', '#fb923c', '#fbbf24', '#a3e635',
  '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185',
  '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2',
  '#2563eb', '#7c3aed', '#c026d3', '#be123c', '#7f1d1d', '#78350f',
]

export default function AdminCardEditor({ design, isOpen, onClose, onSave }: AdminCardEditorProps) {
  const [cardName, setCardName] = useState(design.name || '')
  const [backgroundColor, setBackgroundColor] = useState(design.background_color || '#ffffff')
  const [texts, setTexts] = useState<TextElement[]>(design.texts || [])
  const [images, setImages] = useState<ImageElement[]>(design.images || [])
  const [cardWidth, setCardWidth] = useState(design.width || 400)
  const [cardHeight, setCardHeight] = useState(design.height || 250)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'text' | 'image' | null>(null)
  const [saving, setSaving] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showSaveDropdown, setShowSaveDropdown] = useState(false)
  const [exporting, setExporting] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Reset form when design changes
  useEffect(() => {
    setCardName(design.name || '')
    setBackgroundColor(design.background_color || '#ffffff')
    setTexts(design.texts || [])
    setImages(design.images || [])
    setCardWidth(design.width || 400)
    setCardHeight(design.height || 250)
    setSelectedElement(null)
    setSelectedElementType(null)
  }, [design])

  const addTextElement = () => {
    const newText: TextElement = {
      id: Date.now().toString(),
      content: 'ข้อความใหม่',
      color: '#000000',
      font_size: 16,
      font_weight: 'normal',
      font_style: 'normal',
      font_family: 'Sarabun, sans-serif',
      x: 50,
      y: 50
    }
    setTexts([...texts, newText])
    setSelectedElement(newText.id)
    setSelectedElementType('text')
  }

  const addImageElement = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const newImage: ImageElement = {
            id: Date.now().toString(),
            src: event.target?.result as string,
            width: 100,
            height: 100,
            x: 100,
            y: 100,
            opacity: 1
          }
          setImages([...images, newImage])
          setSelectedElement(newImage.id)
          setSelectedElementType('image')
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTexts(texts.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ))
  }

  const updateImageElement = (id: string, updates: Partial<ImageElement>) => {
    setImages(images.map(image => 
      image.id === id ? { ...image, ...updates } : image
    ))
  }

  const deleteElement = (id: string, type: 'text' | 'image') => {
    if (type === 'text') {
      setTexts(texts.filter(text => text.id !== id))
    } else {
      setImages(images.filter(image => image.id !== id))
    }
    setSelectedElement(null)
    setSelectedElementType(null)
  }

  const selectedText = selectedElementType === 'text' ? texts.find(t => t.id === selectedElement) : null
  const selectedImage = selectedElementType === 'image' ? images.find(i => i.id === selectedElement) : null

  const handleSave = async () => {
    if (!cardName.trim()) {
      toast.error('กรุณากรอกชื่อการ์ด')
      return
    }

    setSaving(true)
    try {
      console.log('Saving card with data:', {
        id: design.id,
        name: cardName,
        background_color: backgroundColor,
        width: cardWidth,
        height: cardHeight,
        texts: texts.length,
        images: images.length
      })

      const updatedDesign: CardDesign = {
        ...design,
        name: cardName,
        background_color: backgroundColor,
        width: cardWidth,
        height: cardHeight,
        texts,
        images,
        updated_at: new Date().toISOString()
      }

      console.log('Calling updateCardDesignAsAdmin with:', updatedDesign)
      const result = await updateCardDesignAsAdmin(design.id, updatedDesign)
      console.log('Admin update result:', result)
      
      onSave(updatedDesign)
      toast.success('บันทึกการ์ดสำเร็จ!')
    } catch (error) {
      console.error('Error saving card:', error)
      
      // แสดง error message ที่ละเอียดขึ้น
      let errorMessage = 'ไม่สามารถบันทึกการ์ดได้'
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`
      }
      
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setCardName(design.name || '')
    setBackgroundColor(design.background_color || '#ffffff')
    setTexts(design.texts || [])
    setImages(design.images || [])
    setCardWidth(design.width || 400)
    setCardHeight(design.height || 250)
    setSelectedElement(null)
    setSelectedElementType(null)
  }

  // Export functions
  const handleExportImage = async () => {
    if (!canvasRef.current) return

    setExporting(true)
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: backgroundColor,
        width: cardWidth,
        height: cardHeight,
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      })

      // Download as PNG
      const link = document.createElement('a')
      link.download = `${cardName || 'card'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('ส่งออกรูปภาพสำเร็จ!')
    } catch (error) {
      console.error('Error exporting image:', error)
      toast.error('ไม่สามารถส่งออกรูปภาพได้')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    if (!canvasRef.current) return

    setExporting(true)
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: backgroundColor,
        width: cardWidth,
        height: cardHeight,
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      // A4 size in points (595.28 x 841.89)
      const pdf = new jsPDF('portrait', 'pt', 'a4')
      const pdfWidth = 595.28
      const pdfHeight = 841.89
      
      // Calculate card dimensions to fit A4
      const cardRatio = cardWidth / cardHeight
      let displayWidth = pdfWidth - 80 // margin
      let displayHeight = displayWidth / cardRatio
      
      if (displayHeight > pdfHeight - 80) {
        displayHeight = pdfHeight - 80
        displayWidth = displayHeight * cardRatio
      }

      const x = (pdfWidth - displayWidth) / 2
      const y = (pdfHeight - displayHeight) / 2

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, y, displayWidth, displayHeight)
      pdf.save(`${cardName || 'card'}.pdf`)

      toast.success('ส่งออก PDF สำเร็จ!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('ไม่สามารถส่งออก PDF ได้')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = () => {
    const exportData = {
      name: cardName,
      background_color: backgroundColor,
      width: cardWidth,
      height: cardHeight,
      texts,
      images,
      exported_at: new Date().toISOString()
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const link = document.createElement('a')
    link.download = `${cardName || 'card'}.json`
    link.href = URL.createObjectURL(dataBlob)
    link.click()
    
    URL.revokeObjectURL(link.href)
    toast.success('ส่งออกไฟล์ JSON สำเร็จ!')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>แก้ไขการ์ด: {design.name}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                รีเซ็ต
              </Button>
              
              {/* Save Dropdown */}
              <Popover open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
                <PopoverTrigger asChild>
                  <Button size="sm" disabled={saving || exporting}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'กำลังบันทึก...' : exporting ? 'กำลังส่งออก...' : 'บันทึก'}
                    <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    <div className="px-2 py-1.5 text-sm font-medium text-gray-900 border-b">
                      บันทึกออนไลน์
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleSave()
                        setShowSaveDropdown(false)
                      }}
                      disabled={saving}
                    >
                      <Cloud className="w-4 h-4 mr-2 text-blue-500" />
                      บันทึกลงฐานข้อมูล
                    </Button>
                    
                    <div className="px-2 py-1.5 text-sm font-medium text-gray-900 border-b border-t">
                      ดาวน์โหลดไฟล์
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleExportImage()
                        setShowSaveDropdown(false)
                      }}
                      disabled={exporting}
                    >
                      <FileDown className="w-4 h-4 mr-2 text-green-500" />
                      บันทึกเป็นรูปภาพ (PNG)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleExportPDF()
                        setShowSaveDropdown(false)
                      }}
                      disabled={exporting}
                    >
                      <FileDown className="w-4 h-4 mr-2 text-red-500" />
                      บันทึกเป็น PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleExportJSON()
                        setShowSaveDropdown(false)
                      }}
                    >
                      <HardDrive className="w-4 h-4 mr-2 text-gray-500" />
                      บันทึกเป็น JSON
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Tools Sidebar */}
          <div className="w-80 border-r bg-gray-50 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Card Settings */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ตั้งค่าการ์ด
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cardName">ชื่อการ์ด</Label>
                    <Input
                      id="cardName"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="กรอกชื่อการ์ด"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="cardWidth">ความกว้าง (px)</Label>
                      <Input
                        id="cardWidth"
                        type="number"
                        value={cardWidth}
                        onChange={(e) => setCardWidth(Number(e.target.value))}
                        min="100"
                        max="800"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardHeight">ความสูง (px)</Label>
                      <Input
                        id="cardHeight"
                        type="number"
                        value={cardHeight}
                        onChange={(e) => setCardHeight(Number(e.target.value))}
                        min="100"
                        max="600"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>สีพื้นหลัง</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                        style={{ backgroundColor }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                    
                    {showColorPicker && (
                      <div className="mt-2 p-3 border rounded-lg bg-white">
                        <div className="grid grid-cols-6 gap-1">
                          {PRESET_COLORS.map((color) => (
                            <div
                              key={color}
                              className="w-8 h-8 rounded cursor-pointer border-2 border-gray-200 hover:border-gray-400"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                setBackgroundColor(color)
                                setShowColorPicker(false)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Elements */}
              <div>
                <h3 className="font-medium mb-3">เพิ่มองค์ประกอบ</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addTextElement}
                    className="justify-start"
                  >
                    <Type className="w-4 h-4 mr-2" />
                    ข้อความ
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addImageElement}
                    className="justify-start"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    รูปภาพ
                  </Button>
                </div>
              </div>

              {/* Element Properties */}
              {selectedText && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center justify-between">
                    <span>แก้ไขข้อความ</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteElement(selectedText.id, 'text')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label>เนื้อหา</Label>
                      <Textarea
                        value={selectedText.content}
                        onChange={(e) => updateTextElement(selectedText.id, { content: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label>แบบอักษร</Label>
                      <Select
                        value={selectedText.font_family}
                        onValueChange={(value) => updateTextElement(selectedText.id, { font_family: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONTS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>ขนาด ({selectedText.font_size}px)</Label>
                      <Slider
                        value={[selectedText.font_size]}
                        onValueChange={([value]) => updateTextElement(selectedText.id, { font_size: value })}
                        min={8}
                        max={48}
                        step={1}
                      />
                    </div>

                    <div>
                      <Label>น้ำหนัก</Label>
                      <Select
                        value={selectedText.font_weight}
                        onValueChange={(value: 'normal' | 'bold') => updateTextElement(selectedText.id, { font_weight: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">ปกติ</SelectItem>
                          <SelectItem value="bold">หนา</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>สีข้อความ</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded border-2 border-gray-300"
                          style={{ backgroundColor: selectedText.color }}
                        />
                        <Input
                          value={selectedText.color}
                          onChange={(e) => updateTextElement(selectedText.id, { color: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>X ({selectedText.x}px)</Label>
                        <Slider
                          value={[selectedText.x]}
                          onValueChange={([value]) => updateTextElement(selectedText.id, { x: value })}
                          min={0}
                          max={cardWidth}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label>Y ({selectedText.y}px)</Label>
                        <Slider
                          value={[selectedText.y]}
                          onValueChange={([value]) => updateTextElement(selectedText.id, { y: value })}
                          min={0}
                          max={cardHeight}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedImage && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center justify-between">
                    <span>แก้ไขรูปภาพ</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteElement(selectedImage.id, 'image')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>ความกว้าง ({selectedImage.width}px)</Label>
                        <Slider
                          value={[selectedImage.width]}
                          onValueChange={([value]) => updateImageElement(selectedImage.id, { width: value })}
                          min={10}
                          max={cardWidth}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label>ความสูง ({selectedImage.height}px)</Label>
                        <Slider
                          value={[selectedImage.height]}
                          onValueChange={([value]) => updateImageElement(selectedImage.id, { height: value })}
                          min={10}
                          max={cardHeight}
                          step={1}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>X ({selectedImage.x}px)</Label>
                        <Slider
                          value={[selectedImage.x]}
                          onValueChange={([value]) => updateImageElement(selectedImage.id, { x: value })}
                          min={0}
                          max={cardWidth}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label>Y ({selectedImage.y}px)</Label>
                        <Slider
                          value={[selectedImage.y]}
                          onValueChange={([value]) => updateImageElement(selectedImage.id, { y: value })}
                          min={0}
                          max={cardHeight}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-8 bg-gray-100 overflow-auto">
            <div className="flex flex-col items-center gap-4">
              {(saving || exporting) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
                  {saving && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึกลงฐานข้อมูล...
                    </div>
                  )}
                  {exporting && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      กำลังส่งออกไฟล์...
                    </div>
                  )}
                </div>
              )}
              
              <div 
                ref={canvasRef}
                className="relative border-2 border-gray-300 shadow-lg"
                style={{ 
                  width: `${cardWidth}px`, 
                  height: `${cardHeight}px`,
                  backgroundColor: backgroundColor 
                }}
              >
                {/* Text Elements */}
                {texts.map((text) => (
                  <div
                    key={text.id}
                    className={`absolute cursor-pointer select-none ${
                      selectedElement === text.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: `${text.x}px`,
                      top: `${text.y}px`,
                      color: text.color,
                      fontSize: `${text.font_size}px`,
                      fontWeight: text.font_weight,
                      fontFamily: text.font_family,
                      fontStyle: text.font_style,
                      whiteSpace: 'pre-wrap'
                    }}
                    onClick={() => {
                      setSelectedElement(text.id)
                      setSelectedElementType('text')
                    }}
                  >
                    {text.content}
                  </div>
                ))}

                {/* Image Elements */}
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`absolute cursor-pointer ${
                      selectedElement === image.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: `${image.x}px`,
                      top: `${image.y}px`,
                      width: `${image.width}px`,
                      height: `${image.height}px`,
                      opacity: image.opacity
                    }}
                    onClick={() => {
                      setSelectedElement(image.id)
                      setSelectedElementType('image')
                    }}
                  >
                    <img
                      src={image.src}
                      alt="Card element"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                ))}

                {/* Click to deselect */}
                <div
                  className="absolute inset-0 -z-10"
                  onClick={() => {
                    setSelectedElement(null)
                    setSelectedElementType(null)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}