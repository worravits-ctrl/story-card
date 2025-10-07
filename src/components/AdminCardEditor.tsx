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
  FileDown,
  Printer
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
  // ลองกู้คืน state จาก localStorage ก่อน
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(`adminCardEditor_${design.id}`)
      if (saved) {
        const cardState = JSON.parse(saved)
        // ตรวจสอบว่าข้อมูลไม่เก่าเกิน 1 ชั่วโมง
        if (Date.now() - cardState.timestamp < 3600000) {
          return {
            name: cardState.name || design.name || '',
            backgroundColor: cardState.backgroundColor || design.background_color || '#ffffff',
            texts: cardState.texts || design.texts || [],
            images: cardState.images || design.images || [],
            width: cardState.width || design.width || 400,
            height: cardState.height || design.height || 250
          }
        }
      }
    } catch (e) {
      console.log('Cannot restore card state:', e)
    }
    
    // ถ้ากู้คืนไม่ได้ ใช้ข้อมูลจาก design
    return {
      name: design.name || '',
      backgroundColor: design.background_color || '#ffffff',
      texts: design.texts || [],
      images: design.images || [],
      width: design.width || 400,
      height: design.height || 250
    }
  }

  const initialState = getInitialState()
  
  const [cardName, setCardName] = useState(initialState.name)
  const [backgroundColor, setBackgroundColor] = useState(initialState.backgroundColor)
  const [texts, setTexts] = useState<TextElement[]>(initialState.texts)
  const [images, setImages] = useState<ImageElement[]>(initialState.images)
  const [cardWidth, setCardWidth] = useState(initialState.width)
  const [cardHeight, setCardHeight] = useState(initialState.height)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'text' | 'image' | null>(null)
  const [saving, setSaving] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showSaveDropdown, setShowSaveDropdown] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [printing, setPrinting] = useState(false)

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
    
    // บันทึก state ลงใน localStorage เพื่อป้องกันการสูญหาย
    const cardState = {
      designId: design.id,
      name: design.name,
      backgroundColor: design.background_color,
      width: design.width,
      height: design.height,
      texts: design.texts,
      images: design.images,
      timestamp: Date.now()
    }
    localStorage.setItem(`adminCardEditor_${design.id}`, JSON.stringify(cardState))
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

  const handlePrint = () => {
    if (!canvasRef.current) return

    setPrinting(true)
    
    // สร้าง unique window name เพื่อป้องกันการทับซ้อน
    const windowName = `printCard_${Date.now()}`
    
    // เปิดแท็บใหม่สำหรับพิมพ์โดยไม่กระทบหน้าปัจจุบัน
    const printWindow = window.open('about:blank', windowName, 'width=800,height=600,scrollbars=yes,resizable=yes,location=no,menubar=no,toolbar=no')
    
    if (!printWindow || printWindow.closed) {
      setPrinting(false)
      toast.error('❌ ไม่สามารถเปิดแท็บพิมพ์ได้ กรุณาอนุญาต popup ในเบราว์เซอร์', {
        duration: 5000,
      })
      return
    }

    // ป้องกันการ focus ที่อาจกระทบต่อแท็บเดิม
    try {
      printWindow.focus()
      
      // บันทึกแท็บเดิม reference
      const originalWindow = window
      
      // หลังจาก 5 วินาที ให้ focus กลับมาที่แท็บเดิม (ถ้าแท็บพิมพ์ยังเปิดอยู่)
      setTimeout(() => {
        try {
          originalWindow.focus()
        } catch (e) {
          // ถ้า focus ไม่ได้ก็ไม่เป็นไร
        }
      }, 5000)
    } catch (e) {
      // ถ้า focus ไม่ได้ ก็ไม่เป็นไร
      console.log('Cannot focus print window:', e)
    }

    // สร้างการ์ดสำหรับพิมพ์ 10 ใบใน A4
    const generateCards = () => {
      let cardsHTML = ''
      for (let i = 0; i < 10; i++) {
        cardsHTML += `
          <div class="card" style="
            width: ${cardWidth * 0.75}px; 
            height: ${cardHeight * 0.75}px; 
            background-color: ${backgroundColor};
            position: relative;
            border: 1px solid #ccc;
            margin: 2mm;
            page-break-inside: avoid;
          ">
            ${texts.map(text => `
              <div style="
                position: absolute;
                left: ${text.x * 0.75}px;
                top: ${text.y * 0.75}px;
                color: ${text.color};
                font-size: ${text.font_size * 0.75}px;
                font-weight: ${text.font_weight};
                font-family: ${text.font_family};
                font-style: ${text.font_style};
                white-space: pre-wrap;
              ">${text.content}</div>
            `).join('')}
            ${images.map(image => `
              <img src="${image.src}" style="
                position: absolute;
                left: ${image.x * 0.75}px;
                top: ${image.y * 0.75}px;
                width: ${image.width * 0.75}px;
                height: ${image.height * 0.75}px;
                opacity: ${image.opacity};
                object-fit: cover;
              " />
            `).join('')}
          </div>
        `
      }
      return cardsHTML
    }

    // สร้าง HTML สำหรับพิมพ์
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>🖨️ พิมพ์การ์ด - ${cardName} (10 ใบ/A4)</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Sarabun', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
            
            .print-container {
              width: 210mm;
              height: 297mm;
              margin: 0 auto;
              padding: 5mm;
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
              align-content: flex-start;
            }

            /* สำหรับพิมพ์จริง - เต็มหน้าเดียว */
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body { margin: 0; padding: 0; }
              .print-container {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 5mm;
                page-break-inside: avoid;
              }
              .card {
                page-break-inside: avoid;
              }
            }

            @media screen {
              .print-container {
                border: 1px solid #ccc;
                background: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${generateCards()}
          </div>
          <script>
            // ป้องกันการ navigation กลับไปหน้าเดิม
            window.addEventListener('beforeunload', function(e) {
              e.preventDefault();
              return null;
            });
            
            // ป้องกัน back button
            history.pushState(null, '', location.href);
            window.addEventListener('popstate', function() {
              history.pushState(null, '', location.href);
            });
            
            window.onload = function() {
              // ตั้งชื่อหน้าต่าง
              document.title = 'พิมพ์การ์ด - กำลังเตรียมข้อมูล...';
              
              // รอให้เนื้อหาโหลดเสร็จ
              setTimeout(() => {
                document.title = 'พิมพ์การ์ด - กำลังพิมพ์...';
                
                // เรียก dialog พิมพ์
                window.print();
                
                // หลังพิมพ์เสร็จ ไม่ปิดแท็บทันที
                setTimeout(() => {
                  document.title = 'การพิมพ์เสร็จสิ้น';
                  document.body.innerHTML = \`
                    <div style="
                      text-align:center;
                      padding:50px;
                      font-family:Arial;
                      background:#f0f9ff;
                      min-height:100vh;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      flex-direction:column;
                    ">
                      <h1 style="color:#0369a1;margin-bottom:20px;">✅ การพิมพ์เสร็จสิ้น</h1>
                      <p style="color:#0f766e;margin-bottom:30px;">การ์ดของคุณยังคงแสดงอยู่ในแท็บเดิม</p>
                      <button onclick="window.close()" style="
                        background:#dc2626;
                        color:white;
                        border:none;
                        padding:10px 20px;
                        border-radius:5px;
                        cursor:pointer;
                        font-size:16px;
                      ">ปิดแท็บนี้</button>
                    </div>
                  \`;
                }, 2000);
              }, 1000);
              
              // จัดการเหตุการณ์หลังจากพิมพ์หรือยกเลิก
              window.addEventListener('afterprint', function() {
                document.title = 'การพิมพ์เสร็จสิ้น';
                setTimeout(() => {
                  document.body.innerHTML = \`
                    <div style="
                      text-align:center;
                      padding:50px;
                      font-family:Arial;
                      background:#f0f9ff;
                      min-height:100vh;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      flex-direction:column;
                    ">
                      <h1 style="color:#0369a1;margin-bottom:20px;">✅ การพิมพ์เสร็จสิ้น</h1>
                      <p style="color:#0f766e;margin-bottom:10px;">การ์ดของคุณยังคงแสดงอยู่ในแท็บเดิม</p>
                      <p style="color:#374151;margin-bottom:30px;font-size:14px;">คุณสามารถกลับไปแก้ไขการ์ดต่อได้</p>
                      <button onclick="window.close()" style="
                        background:#dc2626;
                        color:white;
                        border:none;
                        padding:10px 20px;
                        border-radius:5px;
                        cursor:pointer;
                        font-size:16px;
                      ">ปิดแท็บนี้</button>
                    </div>
                  \`;
                }, 500);
              });
              
              // จัดการเหตุการณ์ยกเลิกการพิมพ์
              window.addEventListener('beforeprint', function() {
                document.title = 'กำลังพิมพ์การ์ด...';
              });
            };
          </script>
        </body>
      </html>
    `

    // เขียน HTML ไปยังแท็บใหม่
    printWindow.document.write(printHTML)
    printWindow.document.close()
    
    // ตั้งเวลาให้ printing state กลับเป็น false
    setTimeout(() => {
      setPrinting(false)
    }, 1500)
    
    // แสดงข้อความยืนยันว่าการ์ดยังคงแสดงอยู่
    toast.success('🖨️ เปิดแท็บพิมพ์ใหม่แล้ว! การ์ดยังคงอยู่ที่นี่เพื่อแก้ไขต่อ', {
      duration: 4000,
    })
  }

  // ป้องกันการปิด modal ขณะพิมพ์
  const handleClose = () => {
    if (printing) {
      toast.info('รอสักครู่ กำลังเตรียมการพิมพ์...', {
        duration: 2000
      })
      return
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
                  <Button size="sm" disabled={saving || exporting || printing}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'กำลังบันทึก...' : exporting ? 'กำลังส่งออก...' : printing ? 'กำลังพิมพ์...' : 'บันทึก'}
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
                    
                    <div className="px-2 py-1.5 text-sm font-medium text-gray-900 border-t">
                      พิมพ์การ์ด
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handlePrint()
                        // ไม่ปิด dropdown ทันที ให้ผู้ใช้เห็นว่าพิมพ์สำเร็จ
                        setTimeout(() => setShowSaveDropdown(false), 1000)
                      }}
                    >
                      <Printer className="w-4 h-4 mr-2 text-purple-500" />
                      พิมพ์การ์ด (10 ใบ/A4)
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={printing}>
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
              {(saving || exporting || printing) && (
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
                  {printing && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      เปิดแท็บพิมพ์ใหม่... การ์ดยังคงอยู่ที่นี่
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