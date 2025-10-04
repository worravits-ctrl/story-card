import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getAllUsers, 
  getAllCardDesigns, 
  updateUserRole, 
  deleteUser, 
  deleteCardDesign,
  type UserProfile,
  type CardDesign 
} from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  Users, 
  FileImage, 
  Shield, 
  Trash2, 
  Search,
  Crown,
  User,
  Calendar,
  Database,
  Activity,
  Settings,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPanel() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [designs, setDesigns] = useState<CardDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'designs'>('users')

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    
    if (userProfile?.role !== 'admin') {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
      navigate('/dashboard')
      return
    }

    loadData()
  }, [user, userProfile, navigate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, designsData] = await Promise.all([
        getAllUsers(),
        getAllCardDesigns()
      ])
      setUsers(usersData)
      setDesigns(designsData)
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      toast.success('อัปเดตสิทธิ์ผู้ใช้สำเร็จ!')
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('ไม่สามารถอัปเดตสิทธิ์ได้')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('ไม่สามารถลบตัวเองได้')
      return
    }

    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) {
      return
    }

    try {
      await deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('ลบผู้ใช้สำเร็จ!')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('ไม่สามารถลบผู้ใช้ได้')
    }
  }

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบการ์ดนี้?')) {
      return
    }

    try {
      await deleteCardDesign(designId)
      setDesigns(prev => prev.filter(d => d.id !== designId))
      toast.success('ลบการ์ดสำเร็จ!')
    } catch (error) {
      console.error('Error deleting design:', error)
      toast.error('ไม่สามารถลบการ์ดได้')
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDesigns = designs.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    totalDesigns: designs.length,
    todayJoined: users.filter(u => {
      const today = new Date()
      const userDate = new Date(u.created_at)
      return userDate.toDateString() === today.toDateString()
    }).length
  }

  if (!user || userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-600">ควบคุมระบบ</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ผู้ดูแลระบบ</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">การ์ดทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDesigns}</p>
                </div>
                <FileImage className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">สมาชิกใหม่วันนี้</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayJoined}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-4 border-b">
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'users' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <Users className="w-4 h-4 inline mr-2" />
              จัดการผู้ใช้
            </button>
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'designs' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('designs')}
            >
              <FileImage className="w-4 h-4 inline mr-2" />
              จัดการการ์ด
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={activeTab === 'users' ? 'ค้นหาผู้ใช้...' : 'ค้นหาการ์ด...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">กำลังโหลด...</p>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {user.full_name || 'ไม่ระบุชื่อ'}
                        </h3>
                        <p className="text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            สมาชิกเมื่อ {new Date(user.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.id !== user?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserRole(
                              user.id, 
                              user.role === 'admin' ? 'user' : 'admin'
                            )}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            {user.role === 'admin' ? 'ลดสิทธิ์' : 'เลื่อนเป็น Admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ไม่พบผู้ใช้
                </h3>
                <p className="text-gray-600">
                  ลองค้นหาด้วยคำอื่น
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDesigns.map((design) => (
              <Card key={design.id}>
                <CardContent className="p-4">
                  <div 
                    className="h-32 rounded-lg mb-4 border-2 border-gray-200 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: design.background_color }}
                  >
                    <div className="absolute inset-2 flex flex-col justify-center items-center">
                      {design.texts.slice(0, 2).map((text, i) => (
                        <div 
                          key={i}
                          className="text-xs truncate mb-1"
                          style={{ 
                            color: text.color,
                            fontSize: '8px',
                            fontWeight: text.fontWeight 
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

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {design.name}
                    </h3>
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

                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full mt-4"
                    onClick={() => handleDeleteDesign(design.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบการ์ด
                  </Button>
                </CardContent>
              </Card>
            ))}

            {filteredDesigns.length === 0 && (
              <div className="col-span-full text-center py-12">
                <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ไม่พบการ์ด
                </h3>
                <p className="text-gray-600">
                  ลองค้นหาด้วยคำอื่น
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}