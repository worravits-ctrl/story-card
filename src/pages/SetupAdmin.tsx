import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContextSupabase'
import { promoteCurrentUserToAdmin, makeFirstUserAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Crown, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SetupAdmin() {
  const { user, userProfile, refreshUserProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePromoteToAdmin = async () => {
    if (!user) {
      toast.error('กรุณาล็อกอินก่อน')
      return
    }

    setLoading(true)
    try {
      await promoteCurrentUserToAdmin()
      await refreshUserProfile()
      setSuccess(true)
      toast.success('ตั้งค่า Admin สำเร็จ!')
      
      // Navigate to admin panel after success
      setTimeout(() => {
        navigate('/admin')
      }, 2000)
    } catch (error: any) {
      console.error('Error promoting to admin:', error)
      toast.error(`ไม่สามารถตั้งค่า Admin ได้: ${error.message || 'เกิดข้อผิดพลาด'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMakeFirstUserAdmin = async () => {
    setLoading(true)
    try {
      const result = await makeFirstUserAdmin()
      if (result) {
        await refreshUserProfile()
        setSuccess(true)
        toast.success('ตั้งค่าผู้ใช้แรกเป็น Admin สำเร็จ!')
        setTimeout(() => {
          navigate('/admin')
        }, 2000)
      } else {
        toast.info('ไม่พบผู้ใช้หรือมี Admin อยู่แล้ว')
      }
    } catch (error: any) {
      console.error('Error making first user admin:', error)
      toast.error(`ไม่สามารถตั้งค่า Admin ได้: ${error.message || 'เกิดข้อผิดพลาด'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">กรุณาล็อกอินก่อน</h3>
            <p className="text-gray-600 mb-4">
              คุณต้องล็อกอินเพื่อตั้งค่า Admin
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              ไปหน้าล็อกอิน
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userProfile?.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">คุณเป็น Admin อยู่แล้ว</h3>
            <p className="text-gray-600 mb-4">
              คุณสามารถเข้าไปจัดการระบบได้
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/admin')} className="w-full">
                ไป Admin Panel
              </Button>
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                ไป Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ตั้งค่า Admin</h1>
            <p className="text-gray-600">กำหนดสิทธิ์ผู้ดูแลระบบ</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ตั้งค่า Admin สำเร็จ! กำลังนำคุณไปยัง Admin Panel...
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              เนื่องจากเป็นการตั้งค่าครั้งแรก คุณสามารถตั้งตัวเองเป็น Admin เพื่อจัดการระบบได้
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                ตั้งตัวเองเป็น Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{userProfile?.full_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  สิทธิ์ปัจจุบัน: <span className="font-medium">{userProfile?.role || 'user'}</span>
                </p>
              </div>

              <p className="text-gray-600 text-sm">
                การตั้งเป็น Admin จะทำให้คุณสามารถ:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>จัดการผู้ใช้ในระบบ</li>
                <li>ควบคุมการ์ดและเนื้อหา</li>
                <li>ดูสถิติและรายงาน</li>
                <li>ตั้งค่าระบบขั้นสูง</li>
              </ul>

              <Button
                onClick={handlePromoteToAdmin}
                disabled={loading || success}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังตั้งค่า...
                  </div>
                ) : success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ตั้งค่าสำเร็จ
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    ตั้งเป็น Admin
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                ตั้งผู้ใช้แรกเป็น Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">
                หากคุณไม่ใช่ผู้ใช้คนแรกในระบบ สามารถตั้งให้ผู้ใช้คนแรกเป็น Admin แทนได้
              </p>

              <Button
                onClick={handleMakeFirstUserAdmin}
                disabled={loading || success}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    กำลังตรวจสอบ...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    ตั้งผู้ใช้แรกเป็น Admin
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Instructions */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Shield className="w-5 h-5" />
                ขั้นตอนการตั้งค่าด้วยตนเอง (หากปุ่มไม่ทำงาน)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-orange-700 space-y-2">
                <p className="font-medium">1. เข้า Supabase SQL Editor</p>
                <p>2. รันคำสั่งนี้เพื่อตั้งค่า admin:</p>
                <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                  <div>UPDATE profiles SET role = 'admin' WHERE email = '{user?.email || 'your-email@example.com'}';</div>
                </div>
                <p>3. หรือ ตั้งผู้ใช้แรกเป็น admin:</p>
                <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                  <div>UPDATE profiles SET role = 'admin' WHERE id = (</div>
                  <div>&nbsp;&nbsp;SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1</div>
                  <div>);</div>
                </div>
                <p className="text-xs text-orange-600">
                  หลังรันคำสั่ง ให้ออกจากระบบแล้วเข้าใหม่เพื่อ refresh สิทธิ์
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}