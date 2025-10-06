import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContextSupabase'
import { getUserCardDesigns, deleteCardDesign, clearAuthData, refreshSession, fastLogout, instantRefresh, checkCurrentUserRole } from '@/lib/supabase'
import type { CardDesign } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Palette, 
  Trash2, 
  Edit, 
  LogOut, 
  Settings,
  FileImage,
  Calendar,
  User,
  Crown
} from 'lucide-react'
import { toast } from 'sonner'

export default function Dashboard() {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<CardDesign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    loadDesigns()
  }, [user, navigate])

  const loadDesigns = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userDesigns = await getUserCardDesigns(user.id)
      setDesigns(userDesigns)
    } catch (error) {
      console.error('Error loading designs:', error)
      toast.error('ไม่สามารถโหลดการ์ดได้')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDesign = async (designId: string) => {
    try {
      await deleteCardDesign(designId)
      setDesigns(prev => prev.filter(d => d.id !== designId))
      toast.success('ลบการ์ดสำเร็จ!')
    } catch (error) {
      console.error('Error deleting design:', error)
      toast.error('ไม่สามารถลบการ์ดได้')
    }
  }

  const handleSignOut = () => {
    // Use fast logout - no waiting, immediate response
    fastLogout()
  }

  const handleInstantRefresh = () => {
    // Use instant refresh - immediate cache clear and reload
    instantRefresh()
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Card Designer</h1>
                <p className="text-xs text-gray-600">Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile.full_name || userProfile.email}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {userProfile.role === 'admin' ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          User
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {userProfile.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    console.log('Debug: Current user:', user)
                    console.log('Debug: User profile:', userProfile)
                    console.log('Debug: Environment:', import.meta.env.MODE)
                    console.log('Debug: URL:', window.location.href)
                    
                    // ตรวจสอบ role ใน database อีกครั้ง
                    const freshProfile = await checkCurrentUserRole()
                    console.log('Debug: Fresh profile from DB:', freshProfile)
                    
                    toast.info('ข้อมูล Debug แสดงใน Console')
                  }}
                  title="Debug Info + Role Check"
                >
                  🐛
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInstantRefresh}
                  title="รีเฟรชทันที - ล้างข้อมูล Cache"
                >
                  🔄
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  title="ออกจากระบบทันที - ไม่ต้องรอ"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            สวัสดี {userProfile.full_name || 'คุณ'}! 👋
          </h2>
          <p className="text-gray-600">
            จัดการและสร้างการ์ดสวยงามของคุณ
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">การ์ดทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{designs.length}</p>
                </div>
                <FileImage className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">สร้างเมื่อไหร่</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Date(userProfile.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">สถานะ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userProfile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}
                  </p>
                </div>
                {userProfile.role === 'admin' ? (
                  <Crown className="w-8 h-8 text-yellow-500" />
                ) : (
                  <User className="w-8 h-8 text-purple-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create New Card */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/designer')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            สร้างการ์ดใหม่
          </Button>
        </div>

        {/* Designs Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">การ์ดของคุณ</h3>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-40 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : designs.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent>
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ยังไม่มีการ์ด
                </h3>
                <p className="text-gray-600 mb-4">
                  เริ่มสร้างการ์ดแรกของคุณเลย!
                </p>
                <Button
                  onClick={() => navigate('/designer')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างการ์ดใหม่
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {designs.map((design) => (
                <Card key={design.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {/* Preview */}
                    <div 
                      className="h-40 rounded-lg mb-4 border-2 border-gray-200 flex items-center justify-center text-xs text-gray-500 relative overflow-hidden"
                      style={{ backgroundColor: design.background_color }}
                    >
                      {/* Simulate card preview */}
                      <div className="absolute inset-2 flex flex-col justify-center items-center">
                        {design.texts.slice(0, 2).map((text, i) => (
                          <div 
                            key={i}
                            className="text-xs truncate mb-1"
                            style={{ 
                              color: text.color,
                              fontSize: '8px',
                              fontWeight: text.font_weight 
                            }}
                          >
                            {text.content}
                          </div>
                        ))}
                        {design.images.length > 0 && (
                          <div className="w-8 h-6 bg-gray-300 rounded text-xs flex items-center justify-center">
                            IMG
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {design.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{design.width}×{design.height}</span>
                        <span>•</span>
                        <span>{design.texts.length}T</span>
                        <span>•</span>
                        <span>{design.images.length}I</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(design.updated_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/designer?design=${design.id}`)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDesign(design.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}