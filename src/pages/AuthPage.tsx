import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Palette } from 'lucide-react'

export default function AuthPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Palette className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Card Designer</h1>
            <p className="text-gray-600 mt-2">สร้างการ์ดสวยงาม พร้อมพิมพ์ A4</p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">
              {view === 'sign_in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {view === 'sign_in' 
                ? 'เข้าสู่ระบบเพื่อเริ่มสร้างการ์ด' 
                : 'สร้างบัญชีใหม่เพื่อเริ่มต้น'
              }
            </p>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              view={view}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#3b82f6',
                      brandAccent: '#1d4ed8',
                      inputBackground: 'transparent',
                      inputBorder: '#e2e8f0',
                      inputBorderHover: '#3b82f6',
                      inputBorderFocus: '#3b82f6',
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '0.5rem',
                      buttonBorderRadius: '0.5rem',
                      inputBorderRadius: '0.5rem',
                    },
                  }
                },
                className: {
                  container: 'space-y-4',
                  button: 'w-full px-4 py-2 rounded-lg font-medium transition-colors',
                  input: 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                  label: 'block text-sm font-medium text-gray-700 mb-1',
                  anchor: 'text-blue-600 hover:text-blue-500 text-sm font-medium',
                  divider: 'text-center text-sm text-gray-500 my-4',
                  message: 'text-center text-sm',
                }
              }}
              theme="light"
              showLinks={true}
              providers={['google', 'github']}
              redirectTo={`${window.location.origin}/dashboard`}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'อีเมล',
                    password_label: 'รหัสผ่าน',
                    button_label: 'เข้าสู่ระบบ',
                    loading_button_label: 'กำลังเข้าสู่ระบบ...',
                    social_provider_text: 'เข้าสู่ระบบด้วย {{provider}}',
                    link_text: 'มีบัญชีแล้ว? เข้าสู่ระบบ',
                  },
                  sign_up: {
                    email_label: 'อีเมล',
                    password_label: 'รหัสผ่าน',
                    button_label: 'สมัครสมาชิก',
                    loading_button_label: 'กำลังสมัครสมาชิก...',
                    social_provider_text: 'สมัครด้วย {{provider}}',
                    link_text: 'ยังไม่มีบัญชี? สมัครสมาชิก',
                  },
                  magic_link: {
                    email_input_label: 'อีเมล',
                    button_label: 'ส่งลิงก์เมจิก',
                    loading_button_label: 'กำลังส่งลิงก์...',
                  },
                  forgotten_password: {
                    email_label: 'อีเมล',
                    button_label: 'ส่งคำแนะนำรีเซ็ตรหัสผ่าน',
                    loading_button_label: 'กำลังส่ง...',
                    link_text: 'ลืมรหัสผ่าน?',
                  },
                }
              }}
            />

            {/* Toggle between sign in/up */}
            <div className="text-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">
                {view === 'sign_in' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}
              </p>
              <Button
                variant="outline"
                onClick={() => setView(view === 'sign_in' ? 'sign_up' : 'sign_in')}
                className="w-full"
              >
                {view === 'sign_in' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับหน้าหลัก
          </Button>
        </div>

        {/* Features Preview */}
        <Card className="bg-white/50 border-0">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">✨ ฟีเจอร์ที่คุณจะได้รับ:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>🖱️ ลาก-วาง และ ปรับขนาดง่ายๆ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>🖨️ พิมพ์ A4 ได้ 10 ภาพในหน้าเดียว</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>💾 บันทึกการ์ดออนไลน์ เข้าถึงได้ทุกที่</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>📱 ส่งออกเป็น PNG, PDF หรือคัดลอก</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}