import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContextLocal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Palette, LogIn, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthPageLocal() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('กรุณาใส่อีเมล')
      return
    }

    try {
      setLoading(true)
      await signIn(email, password || 'demo')
      toast.success('เข้าสู่ระบบสำเร็จ!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Auth error:', error)
      toast.error('ไม่สามารถเข้าสู่ระบบได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับหน้าหลัก
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Card Designer</h1>
            <p className="text-gray-600 mt-2">เข้าสู่ระบบเพื่อเริ่มสร้างการ์ด</p>
          </div>

          {/* Auth Card */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน (ไม่จำเป็น)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="ใส่หรือไม่ใส่ก็ได้"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    * สำหรับ demo ไม่จำเป็นต้องใส่รหัสผ่าน
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 text-center">
                    ผู้ใช้ตัวอย่าง
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail('admin@demo.com')
                        setPassword('')
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Admin Demo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail('user@demo.com')
                        setPassword('')
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      User Demo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>💡 ข้อมูลจะถูกเก็บใน Browser Local Storage</p>
            <p>🎨 ไม่ต้องใช้ Database แต่ข้อมูลจะหายเมื่อล้าง Browser</p>
            <p>🔒 ผู้ใช้คนแรกจะเป็น Admin อัตโนมัติ</p>
          </div>
        </div>
      </div>
    </div>
  )
}