import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Layout,
  Cloud,
  HardDrive,
  Wifi,
  WifiOff,
  LogOut,
  Home
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContextSupabase';
import { 
  saveCardDesign, 
  updateCardDesign, 
  getUserCardDesigns, 
  deleteCardDesign,
  getCardDesignById,
  type CardDesign as DBCardDesign 
} from '@/lib/supabase';

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
  { name: 'A4 Card (เต็มพื้นที่)', width: 1190, height: 680 },
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveMode, setSaveMode] = useState<'online' | 'offline'>('online');
  
  const [currentDesign, setCurrentDesign] = useState<CardDesign>({
    id: '1',
    name: 'A4 Full Card',
    width: 1190,
    height: 680,
    backgroundColor: '#ffffff',
    texts: [],
    images: [],
    createdAt: new Date()
  });

  const [savedDesigns, setSavedDesigns] = useState<CardDesign[]>([]);
  const [onlineDesigns, setOnlineDesigns] = useState<DBCardDesign[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showA4Layout, setShowA4Layout] = useState(true);
  
  // Drag and Drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragElement, setDragElement] = useState<string | null>(null);
  
  // Resize states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeElement, setResizeElement] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
  
  // A4 layout settings - Configurable rows and columns
  const [a4Settings, setA4Settings] = useState({
    rows: 5,
    columns: 2,
    cardCount: 10,  // rows * columns
    rowGap: 15,
    columnGap: 15,
    marginTop: 30,
    marginLeft: 30,
    marginRight: 30,
    marginBottom: 30,
    forceLayout: true
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const a4CanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-update cardCount when rows or columns change
  useEffect(() => {
    setA4Settings(prev => ({
      ...prev,
      cardCount: prev.rows * prev.columns
    }));
  }, [a4Settings.rows, a4Settings.columns]);

  // Load A4 settings from localStorage on mount
  useEffect(() => {
    try {
      const savedA4Settings = localStorage.getItem('cardDesigner_a4Settings');
      if (savedA4Settings) {
        const parsed = JSON.parse(savedA4Settings);
        setA4Settings(prev => ({
          ...prev,
          ...parsed,
          cardCount: parsed.rows * parsed.columns // Ensure cardCount is updated
        }));
      }
    } catch (error) {
      console.error('Failed to load A4 settings:', error);
    }
  }, []);

  // Save A4 settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('cardDesigner_a4Settings', JSON.stringify(a4Settings));
    } catch (error) {
      console.error('Failed to save A4 settings:', error);
    }
  }, [a4Settings]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load designs on component mount
  useEffect(() => {
    loadAllDesigns();
  }, [user]);

  // Load design from URL parameter
  useEffect(() => {
    const loadDesignFromUrl = async () => {
      const searchParams = new URLSearchParams(location.search);
      const designId = searchParams.get('design');
      
      if (designId && user) {
        console.log('Loading design from URL parameter:', designId);
        try {
          const design = await getCardDesignById(designId);
          if (design) {
            console.log('Design loaded from database:', design);
            
            // Convert DB format to component format
            const convertedDesign: CardDesign = {
              id: design.id,
              name: design.name,
              width: design.width,
              height: design.height,
              backgroundColor: design.background_color,
              texts: design.texts?.map((text: any) => ({
                ...text,
                fontSize: text.font_size || text.fontSize,
                fontFamily: text.font_family || text.fontFamily,
                fontWeight: text.font_weight || text.fontWeight,
                fontStyle: text.font_style || text.fontStyle
              })) || [],
              images: design.images || [],
              createdAt: new Date(design.created_at)
            };
            
            setCurrentDesign(convertedDesign);
            toast.success(`โหลดการ์ด "${design.name}" สำเร็จ`);
          } else {
            toast.error('ไม่พบการ์ดที่ต้องการแก้ไข');
          }
        } catch (error) {
          console.error('Error loading design:', error);
          toast.error('ไม่สามารถโหลดการ์ดได้');
        }
      }
    };

    if (user) {
      loadDesignFromUrl();
    }
  }, [location.search, user]);

  const loadAllDesigns = async () => {
    // Load offline designs
    const saved = localStorage.getItem('cardDesigns');
    if (saved) {
      setSavedDesigns(JSON.parse(saved));
    }
    
    // Load online designs if user is logged in
    if (user && isOnline) {
      try {
        const designs = await getUserCardDesigns(user.id);
        setOnlineDesigns(designs);
      } catch (error) {
        console.error('Failed to load online designs:', error);
        toast.error('ไม่สามารถโหลดการ์ดออนไลน์ได้');
      }
    }
  };

  const saveDesign = async () => {
    if (saveMode === 'online' && user && isOnline) {
      await saveDesignOnline();
    } else {
      saveDesignOffline();
    }
  };

  const saveDesignOnline = async () => {
    try {
      // Convert to DB format
      const dbDesign = {
        user_id: user!.id,
        name: currentDesign.name,
        width: currentDesign.width,
        height: currentDesign.height,
        background_color: currentDesign.backgroundColor,
        is_public: false,
        texts: currentDesign.texts.map(t => ({
          id: t.id,
          content: t.content,
          x: t.x,
          y: t.y,
          font_size: t.fontSize,
          font_family: t.fontFamily,
          font_weight: t.fontWeight,
          font_style: t.fontStyle,
          color: t.color
        })),
        images: currentDesign.images.map(img => ({
          id: img.id,
          src: img.src,
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height,
          opacity: img.opacity
        }))
      };

      // Check if updating existing design
      const existingDesign = onlineDesigns.find(d => d.name === currentDesign.name);
      
      if (existingDesign) {
        const updated = await updateCardDesign(existingDesign.id, dbDesign);
        setOnlineDesigns(prev => prev.map(d => d.id === updated.id ? updated : d));
        toast.success('บันทึกการ์ดออนไลน์สำเร็จ! (อัพเดท)');
      } else {
        const saved = await saveCardDesign(dbDesign);
        setOnlineDesigns(prev => [...prev, saved]);
        toast.success('บันทึกการ์ดออนไลน์สำเร็จ! (ใหม่)');
      }
    } catch (error) {
      console.error('Failed to save online:', error);
      toast.error('บันทึกออนไลน์ไม่สำเร็จ กำลังบันทึกแบบออฟไลน์');
      saveDesignOffline();
    }
  };

  const saveDesignOffline = () => {
    const designs = [...savedDesigns];
    const existingIndex = designs.findIndex(d => d.id === currentDesign.id);
    
    if (existingIndex >= 0) {
      designs[existingIndex] = currentDesign;
    } else {
      designs.push({ ...currentDesign, id: Date.now().toString() });
    }
    
    setSavedDesigns(designs);
    localStorage.setItem('cardDesigns', JSON.stringify(designs));
    toast.success('การ์ดถูกบันทึกแล้ว! (ออฟไลน์)');
  };

  const loadDesign = (design: CardDesign) => {
    setCurrentDesign(design);
    setSelectedElement(null);
    toast.success('โหลดการ์ดสำเร็จ!');
  };

  const loadOnlineDesign = (design: DBCardDesign) => {
    // Convert from DB format to local format
    const converted: CardDesign = {
      id: design.id,
      name: design.name,
      width: design.width,
      height: design.height,
      backgroundColor: design.background_color,
      texts: design.texts.map(t => ({
        id: t.id,
        content: t.content,
        x: t.x,
        y: t.y,
        fontSize: t.font_size,
        fontFamily: t.font_family,
        fontWeight: (t.font_weight === 'bold' ? 'bold' : 'normal') as 'normal' | 'bold',
        fontStyle: (t.font_style === 'italic' ? 'italic' : 'normal') as 'normal' | 'italic',
        color: t.color
      })),
      images: design.images.map(img => ({
        ...img,
        opacity: 1
      })),
      createdAt: new Date(design.created_at)
    };
    
    setCurrentDesign(converted);
    setSelectedElement(null);
    toast.success('โหลดการ์ดออนไลน์สำเร็จ!');
  };

  const deleteDesign = (designId: string) => {
    const designs = savedDesigns.filter(d => d.id !== designId);
    setSavedDesigns(designs);
    localStorage.setItem('cardDesigns', JSON.stringify(designs));
    toast.success('ลบการ์ดแล้ว (ออฟไลน์)');
  };

  const deleteOnlineDesign = async (designId: string) => {
    try {
      await deleteCardDesign(designId);
      setOnlineDesigns(prev => prev.filter(d => d.id !== designId));
      toast.success('ลบการ์ดออนไลน์แล้ว');
    } catch (error) {
      console.error('Failed to delete online design:', error);
      toast.error('ไม่สามารถลบการ์ดออนไลน์ได้');
    }
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('ไม่สามารถออกจากระบบได้');
    }
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

  // Drag and Drop Functions
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (isPreviewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = currentDesign.width / 600; // Canvas display width is 600px
    const scaleY = currentDesign.height / 430; // Canvas display height is 430px
    
    const element = currentDesign.texts.find(t => t.id === elementId) || 
                   currentDesign.images.find(i => i.id === elementId);
    
    if (!element) return;

    const offsetX = (e.clientX - rect.left) * scaleX - element.x;
    const offsetY = (e.clientY - rect.top) * scaleY - element.y;
    
    setDragElement(elementId);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setSelectedElement(elementId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragElement || !canvasRef.current) return;
    
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = currentDesign.width / 600;
    const scaleY = currentDesign.height / 430;
    
    const newX = Math.max(0, Math.min(
      currentDesign.width - 10,
      (e.clientX - rect.left) * scaleX - dragOffset.x
    ));
    const newY = Math.max(0, Math.min(
      currentDesign.height - 10,
      (e.clientY - rect.top) * scaleY - dragOffset.y
    ));

    // Update text position
    const textElement = currentDesign.texts.find(t => t.id === dragElement);
    if (textElement) {
      updateText(dragElement, { x: newX, y: newY });
      return;
    }

    // Update image position
    const imageElement = currentDesign.images.find(i => i.id === dragElement);
    if (imageElement) {
      updateImage(dragElement, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragElement(null);
    setDragOffset({ x: 0, y: 0 });
    setIsResizing(false);
    setResizeElement(null);
    setResizeHandle(null);
  };

  // Resize Functions
  const handleResizeMouseDown = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = currentDesign.texts.find(t => t.id === elementId) || 
                   currentDesign.images.find(i => i.id === elementId);
    
    if (!element) return;

    setResizeElement(elementId);
    setResizeHandle(handle);
    setIsResizing(true);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    
    if ('fontSize' in element) {
      // Text element
      setInitialSize({ width: element.fontSize, height: element.fontSize });
    } else {
      // Image element
      setInitialSize({ width: element.width, height: element.height });
    }
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizeElement || !canvasRef.current) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - initialMousePos.x;
    const deltaY = e.clientY - initialMousePos.y;
    const scale = Math.min(600/currentDesign.width, 430/currentDesign.height);
    
    const scaledDeltaX = deltaX / scale;
    const scaledDeltaY = deltaY / scale;

    const textElement = currentDesign.texts.find(t => t.id === resizeElement);
    if (textElement) {
      // Resize text (fontSize)
      let newFontSize = initialSize.width;
      
      if (resizeHandle === 'se' || resizeHandle === 'sw') {
        newFontSize = Math.max(8, Math.min(72, initialSize.width + scaledDeltaY * 0.5));
      } else if (resizeHandle === 'ne' || resizeHandle === 'nw') {
        newFontSize = Math.max(8, Math.min(72, initialSize.width - scaledDeltaY * 0.5));
      }
      
      updateText(resizeElement, { fontSize: Math.round(newFontSize) });
      return;
    }

    const imageElement = currentDesign.images.find(i => i.id === resizeElement);
    if (imageElement) {
      // Resize image
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      
      if (resizeHandle === 'se') {
        newWidth = Math.max(20, initialSize.width + scaledDeltaX);
        newHeight = Math.max(20, initialSize.height + scaledDeltaY);
      } else if (resizeHandle === 'sw') {
        newWidth = Math.max(20, initialSize.width - scaledDeltaX);
        newHeight = Math.max(20, initialSize.height + scaledDeltaY);
      } else if (resizeHandle === 'ne') {
        newWidth = Math.max(20, initialSize.width + scaledDeltaX);
        newHeight = Math.max(20, initialSize.height - scaledDeltaY);
      } else if (resizeHandle === 'nw') {
        newWidth = Math.max(20, initialSize.width - scaledDeltaX);
        newHeight = Math.max(20, initialSize.height - scaledDeltaY);
      }
      
      updateImage(resizeElement, { 
        width: Math.round(newWidth), 
        height: Math.round(newHeight) 
      });
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing && canvasRef.current) {
        const deltaX = e.clientX - initialMousePos.x;
        const deltaY = e.clientY - initialMousePos.y;
        const scale = Math.min(600/currentDesign.width, 430/currentDesign.height);
        
        const scaledDeltaX = deltaX / scale;
        const scaledDeltaY = deltaY / scale;

        if (resizeElement) {
          const textElement = currentDesign.texts.find(t => t.id === resizeElement);
          if (textElement) {
            let newFontSize = initialSize.width;
            
            if (resizeHandle === 'se' || resizeHandle === 'sw') {
              newFontSize = Math.max(8, Math.min(72, initialSize.width + scaledDeltaY * 0.5));
            } else if (resizeHandle === 'ne' || resizeHandle === 'nw') {
              newFontSize = Math.max(8, Math.min(72, initialSize.width - scaledDeltaY * 0.5));
            }
            
            updateText(resizeElement, { fontSize: Math.round(newFontSize) });
            return;
          }

          const imageElement = currentDesign.images.find(i => i.id === resizeElement);
          if (imageElement) {
            let newWidth = initialSize.width;
            let newHeight = initialSize.height;
            
            if (resizeHandle === 'se') {
              newWidth = Math.max(20, initialSize.width + scaledDeltaX);
              newHeight = Math.max(20, initialSize.height + scaledDeltaY);
            } else if (resizeHandle === 'sw') {
              newWidth = Math.max(20, initialSize.width - scaledDeltaX);
              newHeight = Math.max(20, initialSize.height + scaledDeltaY);
            } else if (resizeHandle === 'ne') {
              newWidth = Math.max(20, initialSize.width + scaledDeltaX);
              newHeight = Math.max(20, initialSize.height - scaledDeltaY);
            } else if (resizeHandle === 'nw') {
              newWidth = Math.max(20, initialSize.width - scaledDeltaX);
              newHeight = Math.max(20, initialSize.height - scaledDeltaY);
            }
            
            updateImage(resizeElement, { 
              width: Math.round(newWidth), 
              height: Math.round(newHeight) 
            });
          }
        }
      } else if (isDragging && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = currentDesign.width / 600;
        const scaleY = currentDesign.height / 430;
        
        const newX = Math.max(0, Math.min(
          currentDesign.width - 10,
          (e.clientX - rect.left) * scaleX - dragOffset.x
        ));
        const newY = Math.max(0, Math.min(
          currentDesign.height - 10,
          (e.clientY - rect.top) * scaleY - dragOffset.y
        ));

        if (dragElement) {
          const textElement = currentDesign.texts.find(t => t.id === dragElement);
          if (textElement) {
            updateText(dragElement, { x: newX, y: newY });
            return;
          }

          const imageElement = currentDesign.images.find(i => i.id === dragElement);
          if (imageElement) {
            updateImage(dragElement, { x: newX, y: newY });
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragElement(null);
      setDragOffset({ x: 0, y: 0 });
      setIsResizing(false);
      setResizeElement(null);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, dragElement, resizeElement, dragOffset, resizeHandle, initialSize, initialMousePos, currentDesign.width, currentDesign.height]);

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
      // สร้าง canvas ด้วยขนาดที่เหมาะสม
      const canvas = await html2canvas(a4CanvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 3.779, // Scale สำหรับ A4 300 DPI
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: A4_DIMENSIONS.width,
        height: A4_DIMENSIONS.height
      });
      
      // สร้าง PDF ขนาด A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = 297; // A4 height in mm
      
      // เพิ่มรูปภาพลง PDF
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95), 
        'JPEG', 
        0, 
        0, 
        imgWidth, 
        imgHeight,
        undefined,
        'FAST'
      );
      
      pdf.save(`${currentDesign.name}_A4_Layout_${a4Settings.cardCount}Cards.pdf`);
      
      toast.success('ส่งออก A4 PDF (10 ภาพ) สำเร็จ!');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออก A4 PDF');
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

  const calculateA4Layout = () => {
    const { cardCount, rows, columns, rowGap, columnGap, marginLeft, marginRight, marginTop, marginBottom, forceLayout } = a4Settings;
    
    if (forceLayout && cardCount > 0) {
      const availableWidth = A4_DIMENSIONS.width - marginLeft - marginRight;
      const availableHeight = A4_DIMENSIONS.height - marginTop - marginBottom;
      
      // Calculate optimal card size based on rows and columns
      const optimalCardWidth = Math.floor((availableWidth - (columns - 1) * columnGap) / columns);
      const optimalCardHeight = Math.floor((availableHeight - (rows - 1) * rowGap) / rows);
      
      if (currentDesign.width !== optimalCardWidth || currentDesign.height !== optimalCardHeight) {
        setCurrentDesign(prev => ({
          ...prev,
          width: optimalCardWidth,
          height: optimalCardHeight
        }));
      }
      
      return { rows, cols: columns, optimalCardWidth, optimalCardHeight };
    }
    
    return { rows: 5, cols: 2 };
  };

  const printCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // คำนวณขนาดการ์ดในหน่วย mm สำหรับ A4 (210x297mm)
    const marginLeftMm = (a4Settings.marginLeft * 210) / A4_DIMENSIONS.width;
    const marginRightMm = (a4Settings.marginRight * 210) / A4_DIMENSIONS.width;
    const marginTopMm = (a4Settings.marginTop * 297) / A4_DIMENSIONS.height;
    const marginBottomMm = (a4Settings.marginBottom * 297) / A4_DIMENSIONS.height;
    const rowGapMm = (a4Settings.rowGap * 297) / A4_DIMENSIONS.height;
    const columnGapMm = (a4Settings.columnGap * 210) / A4_DIMENSIONS.width;
    
    const availableWidthMm = 210 - marginLeftMm - marginRightMm;
    const availableHeightMm = 297 - marginTopMm - marginBottomMm;
    const cardWidthMm = (availableWidthMm - (a4Settings.columns - 1) * columnGapMm) / a4Settings.columns;
    const cardHeightMm = (availableHeightMm - (a4Settings.rows - 1) * rowGapMm) / a4Settings.rows;

    // สร้าง HTML สำหรับการ์ดตามจำนวนที่กำหนด
    let cardsHTML = '';
    for (let index = 0; index < a4Settings.cardCount; index++) {
      const col = index % a4Settings.columns;
      const row = Math.floor(index / a4Settings.columns);
      const xMm = marginLeftMm + col * (cardWidthMm + columnGapMm);
      const yMm = marginTopMm + row * (cardHeightMm + rowGapMm);

      // สร้างข้อความด้วยขนาดที่ปรับตามอัตราส่วน
      const textsHTML = currentDesign.texts.map(text => {
        const scaledFontSizeMm = Math.max(2, (text.fontSize * cardWidthMm) / currentDesign.width);
        const xPosMm = (text.x * cardWidthMm) / currentDesign.width;
        const yPosMm = (text.y * cardHeightMm) / currentDesign.height;
        
        return `
          <div style="
            position: absolute;
            left: ${xPosMm}mm;
            top: ${yPosMm}mm;
            font-size: ${scaledFontSizeMm}mm;
            font-family: '${text.fontFamily}', 'Noto Sans Thai', sans-serif;
            color: ${text.color};
            font-weight: ${text.fontWeight};
            font-style: ${text.fontStyle};
            line-height: 1.2;
            white-space: nowrap;
          ">${text.content}</div>
        `;
      }).join('');

      // สร้างรูปภาพด้วยขนาดที่ปรับตามอัตราส่วน
      const imagesHTML = currentDesign.images.map(image => {
        const widthMm = (image.width * cardWidthMm) / currentDesign.width;
        const heightMm = (image.height * cardHeightMm) / currentDesign.height;
        const xPosMm = (image.x * cardWidthMm) / currentDesign.width;
        const yPosMm = (image.y * cardHeightMm) / currentDesign.height;
        
        return `
          <div style="
            position: absolute;
            left: ${xPosMm}mm;
            top: ${yPosMm}mm;
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            opacity: ${image.opacity};
            overflow: hidden;
          ">
            <img src="${image.src}" style="
              width: 100%; 
              height: 100%; 
              object-fit: cover;
              display: block;
            " />
          </div>
        `;
      }).join('');

      cardsHTML += `
        <div style="
          position: absolute;
          left: ${xMm}mm;
          top: ${yMm}mm;
          width: ${cardWidthMm}mm;
          height: ${cardHeightMm}mm;
          background-color: ${currentDesign.backgroundColor};
          border: 0.1mm solid #ddd;
          overflow: hidden;
        ">
          ${textsHTML}
          ${imagesHTML}
        </div>
      `;
    }

    // สร้าง HTML สำหรับพิมพ์
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>พิมพ์การ์ด A4 - ${currentDesign.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Mitr:wght@200;300;400;500;600;700&family=Prompt:wght@100;200;300;400;500;600;700;800;900&family=Kanit:wght@100;200;300;400;500;600;700;800;900&family=Sarabun:wght@100;200;300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
              padding: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: 'Inter', 'Noto Sans Thai', 'Mitr', 'Prompt', 'Kanit', 'Sarabun', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              width: 210mm;
              height: 297mm;
              overflow: hidden;
            }
            
            .print-container {
              position: relative;
              width: 210mm;
              height: 297mm;
              background: white;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            
            /* สำหรับพิมพ์จริง - เต็มหน้าเดียว */
            @media print {
              html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
              }
              
              .print-container {
                width: 210mm !important;
                height: 297mm !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
            }
            
            /* สำหรับแสดงในหน้าจอ */
            @media screen {
              body {
                padding: 10px;
                background: #f0f0f0;
              }
              .print-container {
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                margin: 0 auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${cardsHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    toast.success(`เริ่มการพิมพ์ A4 Layout - ${a4Settings.cardCount} ภาพต่อหน้า`);
  };

  const selectedTextElement = selectedElement && currentDesign.texts.find(t => t.id === selectedElement);
  const selectedImageElement = selectedElement && currentDesign.images.find(i => i.id === selectedElement);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-96 sidebar-gradient border-r border-border custom-scrollbar overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <div className="text-center">
              <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                Card Designer
              </h1>
              <p className="text-xs text-muted-foreground">สร้างการ์ดสวยงามได้อย่างง่ายดาย</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-blue-800 mb-1">💡 วิธีใช้:</p>
              <div className="grid grid-cols-1 gap-1">
                <p className="text-xs text-blue-700">🖱️ ลาก → ย้าย</p>
                <p className="text-xs text-blue-700">🔵 ลากจุด → ขยาย</p>
                <p className="text-xs text-blue-700">👆 คลิก → แก้ไข</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              เทมเพลต
            </Label>
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
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              การตั้งค่าการ์ด
            </Label>
            <Card>
              <CardContent className="p-3 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">ชื่อการ์ด</Label>
                  <Input
                    value={currentDesign.name}
                    onChange={(e) => setCurrentDesign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ชื่อการ์ด"
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">กว้าง</Label>
                    <Input
                      type="number"
                      value={currentDesign.width}
                      onChange={(e) => setCurrentDesign(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">สูง</Label>
                    <Input
                      type="number"
                      value={currentDesign.height}
                      onChange={(e) => setCurrentDesign(prev => ({ ...prev, height: parseInt(e.target.value) || 300 }))}
                      className="h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">สีพื้นหลัง</Label>
                  <Input
                    type="color"
                    value={currentDesign.backgroundColor}
                    onChange={(e) => setCurrentDesign(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Text Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Type className="w-4 h-4" />
                ข้อความ ({currentDesign.texts.length}/5)
              </Label>
              <Button 
                size="sm" 
                onClick={addText}
                disabled={currentDesign.texts.length >= 5}
                variant="outline"
                className="h-7 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                เพิ่ม
              </Button>
            </div>

            {selectedTextElement && (
              <Card className="border-blue-200">
                <CardContent className="p-3 space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">เนื้อหา</Label>
                    <Textarea
                      value={selectedTextElement.content}
                      onChange={(e) => updateText(selectedTextElement.id, { content: e.target.value })}
                      placeholder="ใส่ข้อความ..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ฟอนต์</Label>
                      <Select
                        value={selectedTextElement.fontFamily}
                        onValueChange={(value) => updateText(selectedTextElement.id, { fontFamily: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font} value={font} className="text-xs">{font}</SelectItem>
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
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">สี</Label>
                    <Input
                      type="color"
                      value={selectedTextElement.color}
                      onChange={(e) => updateText(selectedTextElement.id, { color: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={selectedTextElement.fontWeight === 'bold' ? 'default' : 'outline'}
                      onClick={() => updateText(selectedTextElement.id, { 
                        fontWeight: selectedTextElement.fontWeight === 'bold' ? 'normal' : 'bold' 
                      })}
                      className="h-7 px-2"
                    >
                      <Type className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTextElement.fontStyle === 'italic' ? 'default' : 'outline'}
                      onClick={() => updateText(selectedTextElement.id, { 
                        fontStyle: selectedTextElement.fontStyle === 'italic' ? 'normal' : 'italic' 
                      })}
                      className="h-7 px-2"
                    >
                      <em className="text-xs">I</em>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteText(selectedTextElement.id)}
                      className="h-7 px-2 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Image Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                รูปภาพ ({currentDesign.images.length}/3)
              </Label>
              <Button 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={currentDesign.images.length >= 3}
                variant="outline"
                className="h-7 px-2"
              >
                <Upload className="w-3 h-3 mr-1" />
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
              <Card className="border-green-200">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">กว้าง</Label>
                      <Input
                        type="number"
                        value={selectedImageElement.width}
                        onChange={(e) => updateImage(selectedImageElement.id, { width: parseInt(e.target.value) || 100 })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">สูง</Label>
                      <Input
                        type="number"
                        value={selectedImageElement.height}
                        onChange={(e) => updateImage(selectedImageElement.id, { height: parseInt(e.target.value) || 100 })}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">ความโปร่งใส: {Math.round(selectedImageElement.opacity * 100)}%</Label>
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
                    className="w-full h-7"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    ลบรูป
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* A4 Layout Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                <Layout className="w-4 h-4" />
                A4 เลย์เอาต์ ({a4Settings.cardCount})
              </Label>
              <Button 
                size="sm" 
                variant={showA4Layout ? "default" : "outline"}
                onClick={() => setShowA4Layout(!showA4Layout)}
                className={`h-7 px-2 ${showA4Layout ? "bg-blue-500 hover:bg-blue-600" : "border-blue-500 text-blue-600 hover:bg-blue-50"}`}
              >
                <Layout className="w-3 h-3 mr-1" />
                {showA4Layout ? 'ซ่อน' : 'แสดง'}
              </Button>
            </div>

            {showA4Layout && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      🎯 {a4Settings.columns}×{a4Settings.rows} = {a4Settings.cardCount} ภาพ
                    </Badge>
                    <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                      เต็ม A4
                    </Badge>
                  </div>
                  
                  <div className="p-2 bg-green-100 rounded border border-green-200">
                    <div className="text-xs text-green-700">
                      📐 {currentDesign.width}×{currentDesign.height}px • 🖨️ {a4Settings.columns} คอลัมน์×{a4Settings.rows} แถว
                    </div>
                  </div>
                  
                  {/* Row and Column Settings */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-green-700">📊 จำนวนแถว</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={a4Settings.rows}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          rows: parseInt(e.target.value) || 5 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">📈 จำนวนคอลัมน์</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={a4Settings.columns}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          columns: parseInt(e.target.value) || 2 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* Gap Settings */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-green-700">↕️ ระยะห่างแถว</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={a4Settings.rowGap}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          rowGap: parseInt(e.target.value) || 15 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">↔️ ระยะห่างคอลัมน์</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={a4Settings.columnGap}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          columnGap: parseInt(e.target.value) || 15 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div>
                      <Label className="text-xs text-green-700">⬅️</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginLeft}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginLeft: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">➡️</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginRight}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginRight: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">⬆️</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginTop}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginTop: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">⬇️</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={a4Settings.marginBottom}
                        onChange={(e) => setA4Settings(prev => ({ 
                          ...prev, 
                          marginBottom: parseInt(e.target.value) || 30 
                        }))}
                        className="border-green-300 focus:border-green-500 h-7 text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <Button onClick={exportA4AsPDF} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    <Button onClick={printCard} variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50 h-7 text-xs">
                      <Printer className="w-3 h-3 mr-1" />
                      พิมพ์
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              การจัดการ
            </Label>
            <div className="grid grid-cols-2 gap-1">
              <Button onClick={saveDesign} variant="default" className="h-8 text-xs">
                {saveMode === 'online' ? (
                  <>
                    <Cloud className="w-3 h-3 mr-1" />
                    บันทึกออนไลน์
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3 mr-1" />
                    บันทึกออฟไลน์
                  </>
                )}
              </Button>
              <Button onClick={clearCanvas} variant="outline" className="h-8 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                ล้าง
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button onClick={copyCardImage} variant="secondary" size="sm" className="h-7 text-xs">
                <Copy className="w-3 h-3 mr-1" />
                คัดลอก
              </Button>
              <Button onClick={exportAsPNG} variant="secondary" size="sm" className="h-7 text-xs">
                <FileImage className="w-3 h-3 mr-1" />
                PNG
              </Button>
              <Button onClick={exportAsPDF} variant="secondary" size="sm" className="h-7 text-xs">
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="h-7 text-xs">
                <Home className="w-3 h-3 mr-1" />
                Dashboard
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="h-7 text-xs text-red-600">
                <LogOut className="w-3 h-3 mr-1" />
                ออกจากระบบ
              </Button>
            </div>
          </div>

          <Separator />

          {/* Save Mode Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              โหมดบันทึก
            </Label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={saveMode === 'online' ? 'default' : 'outline'}
                onClick={() => setSaveMode('online')}
                disabled={!user || !isOnline}
                className="flex-1 text-xs"
              >
                <Cloud className="w-3 h-3 mr-1" />
                Online
              </Button>
              <Button
                size="sm"
                variant={saveMode === 'offline' ? 'default' : 'outline'}
                onClick={() => setSaveMode('offline')}
                className="flex-1 text-xs"
              >
                <HardDrive className="w-3 h-3 mr-1" />
                Offline
              </Button>
            </div>
          </div>

          <Separator />

          {/* Saved Designs */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saveMode === 'online' ? 'การ์ดออนไลน์' : 'การ์ดออฟไลน์'} 
              ({saveMode === 'online' ? onlineDesigns.length : savedDesigns.length})
            </Label>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {saveMode === 'online' ? (
                  // Online designs
                  onlineDesigns.map((design) => (
                    <Card key={design.id} className="p-2 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1" onClick={() => loadOnlineDesign(design)}>
                          <p className="text-xs font-medium truncate flex items-center gap-1">
                            <Cloud className="w-3 h-3 text-blue-500" />
                            {design.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {design.width}×{design.height} • {design.texts.length}T • {design.images.length}I
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOnlineDesign(design.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  // Offline designs
                  savedDesigns.map((design) => (
                    <Card key={design.id} className="p-2 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1" onClick={() => loadDesign(design)}>
                          <p className="text-xs font-medium truncate flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-gray-500" />
                            {design.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {design.width}×{design.height} • {design.texts.length}T • {design.images.length}I
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDesign(design.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
                
                {((saveMode === 'online' && onlineDesigns.length === 0) || 
                  (saveMode === 'offline' && savedDesigns.length === 0)) && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    ยังไม่มีการ์ดที่บันทึก
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-6 canvas-area min-h-screen overflow-auto">
        <div className="mb-6 flex items-center gap-4 flex-wrap justify-center">
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

        <div className="flex flex-col xl:flex-row gap-8 items-start justify-center w-full min-h-[1200px]">
          {/* Single Card Canvas */}
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-blue-700">🎨 การ์ดตัวอย่าง</h3>
            <div className="relative">
              <div 
                ref={canvasRef}
                className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-blue-200"
                style={{
                  width: `600px`,
                  height: `430px`,
                  backgroundColor: currentDesign.backgroundColor,
                }}
                onClick={() => !isDragging && !isResizing && setSelectedElement(null)}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleResizeMouseMove(e);
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div
                  style={{
                    width: `${currentDesign.width}px`,
                    height: `${currentDesign.height}px`,
                    transform: `scale(${Math.min(600/currentDesign.width, 430/currentDesign.height)})`,
                    transformOrigin: 'top left',
                    position: 'absolute'
                  }}
                >
                  {/* Text Elements */}
                  {currentDesign.texts.map((text) => (
                    <div
                      key={text.id}
                      className={`draggable-text ${selectedElement === text.id ? 'selected' : ''} ${
                        isPreviewMode ? 'pointer-events-none border-transparent' : 'cursor-move'
                      } ${isDragging && dragElement === text.id ? 'dragging' : ''}`}
                      style={{
                        left: `${text.x}px`,
                        top: `${text.y}px`,
                        fontSize: `${text.fontSize}px`,
                        fontFamily: text.fontFamily,
                        color: text.color,
                        fontWeight: text.fontWeight,
                        fontStyle: text.fontStyle,
                        userSelect: 'none',
                        zIndex: isDragging && dragElement === text.id ? 1000 : 1
                      }}
                      onMouseDown={(e) => handleMouseDown(e, text.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPreviewMode && !isDragging) setSelectedElement(text.id);
                      }}
                    >
                      {text.content}
                      
                      {/* Text Resize Handles */}
                      {selectedElement === text.id && !isPreviewMode && (
                        <>
                          <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-se-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, text.id, 'se')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -top-2 -right-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-ne-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, text.id, 'ne')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-sw-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, text.id, 'sw')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -top-2 -left-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-nw-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, text.id, 'nw')}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  {/* Image Elements */}
                  {currentDesign.images.map((image) => (
                    <div
                      key={image.id}
                      className={`draggable-image ${selectedElement === image.id ? 'selected' : ''} ${
                        isPreviewMode ? 'pointer-events-none border-transparent' : 'cursor-move'
                      } ${isDragging && dragElement === image.id ? 'dragging' : ''}`}
                      style={{
                        left: `${image.x}px`,
                        top: `${image.y}px`,
                        width: `${image.width}px`,
                        height: `${image.height}px`,
                        opacity: image.opacity,
                        userSelect: 'none',
                        zIndex: isDragging && dragElement === image.id ? 1000 : 1
                      }}
                      onMouseDown={(e) => handleMouseDown(e, image.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPreviewMode && !isDragging) setSelectedElement(image.id);
                      }}
                    >
                      <img 
                        src={image.src} 
                        alt="Card element" 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                      
                      {/* Image Resize Handles */}
                      {selectedElement === image.id && !isPreviewMode && (
                        <>
                          <div
                            className="absolute -top-2 -left-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-nw-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, image.id, 'nw')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -top-2 -right-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-ne-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, image.id, 'ne')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-sw-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, image.id, 'sw')}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-se-resize hover:bg-primary/80"
                            onMouseDown={(e) => handleResizeMouseDown(e, image.id, 'se')}
                            onClick={(e) => e.stopPropagation()}
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
                        <p className="text-xs text-muted-foreground mt-2">💡 ลากเพื่อย้าย • ลากจุดเพื่อปรับขนาด</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  📐 {currentDesign.width} × {currentDesign.height} px
                </Badge>
              </div>
            </div>
          </div>

          {/* A4 Layout Canvas */}
          {showA4Layout && (
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4 text-green-700">🖨️ A4 เต็มพื้นที่ (10 ภาพ)</h3>
              <div className="border-4 border-green-300 shadow-2xl bg-white rounded-xl overflow-hidden" 
                   style={{ width: '656px', height: '928px' }}>
                <div 
                  ref={a4CanvasRef}
                  className="relative bg-white w-full h-full"
                  style={{
                    width: `${A4_DIMENSIONS.width}px`,
                    height: `${A4_DIMENSIONS.height}px`,
                    transform: 'scale(0.264583)',
                    transformOrigin: 'top left'
                  }}
                >
                  {/* Render exactly 10 cards in 2x5 layout */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const col = index % 2;
                    const row = Math.floor(index / 2);
                    
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
                        {/* Render text elements */}
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

                        {/* Render image elements */}
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
              <div className="mt-6 text-center max-w-md">
                <Badge className="bg-green-100 text-green-800 border-green-300 text-sm px-4 py-2 mb-3">
                  🎯 พิมพ์ได้ 10 ภาพเต็ม A4 ในหน้าเดียว
                </Badge>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-2">
                    📐 การ์ดขนาดจริง: <span className="font-bold text-green-800">
                    {Math.floor((A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight - a4Settings.columnGap) / 2)} × {Math.floor((A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom - 4 * a4Settings.rowGap) / 5)} px
                    </span>
                  </p>
                  <p className="text-sm text-green-700 font-medium mb-1">
                    🔢 เลย์เอาต์: <span className="font-bold text-green-800">2 คอลัมน์ × 5 แถว = 10 ภาพ</span>
                  </p>
                  <p className="text-sm text-green-700 font-medium mb-2">
                    📏 ขนาดพิมพ์: <span className="font-bold text-green-800">~{Math.round((Math.floor((A4_DIMENSIONS.width - a4Settings.marginLeft - a4Settings.marginRight - a4Settings.columnGap) / 2) * 0.264583) / 10) * 10}×{Math.round((Math.floor((A4_DIMENSIONS.height - a4Settings.marginTop - a4Settings.marginBottom - 4 * a4Settings.rowGap) / 5) * 0.264583) / 10) * 10}mm</span>
                  </p>
                  <p className="text-xs text-green-600">
                    ✨ หน้าจอแสดง: 656×928px (26% ของขนาดจริง)<br/>
                    📄 เต็มพื้นที่ A4 (210×297mm) คุณภาพสูง 300 DPI
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}