import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContextSupabase'
import { 
  getAllUsers, 
  getAllCardDesigns, 
  updateUserRole, 
  deleteUser, 
  deleteCardDesign,
  clearAuthData,
  forceRefreshAuth,
  type UserProfile,
  type CardDesign 
} from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  RefreshCw,
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  Ban,
  Edit,
  Check,
  X,
  MoreVertical,
  UserCog
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPanel() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [designs, setDesigns] = useState<CardDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'designs' | 'analytics'>('users')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

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
      console.log('Loading admin data...')
      const [usersData, designsData] = await Promise.all([
        getAllUsers(),
        getAllCardDesigns()
      ])
      console.log('Users data:', usersData)
      console.log('Designs data:', designsData)
      setUsers(usersData)
      setDesigns(designsData)
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error(`ไม่สามารถโหลดข้อมูลได้: ${error.message || 'เกิดข้อผิดพลาด'}`)
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

    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
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

  const handleBanUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('ไม่สามารถระงับตัวเองได้')
      return
    }

    if (!confirm('คุณแน่ใจหรือไม่ที่จะระงับผู้ใช้นี้?')) {
      return
    }

    try {
      // สำหรับตอนนี้เราจะใช้การเปลี่ยน role แทน ban
      // ในอนาคตสามารถเพิ่ม banned field ในฐานข้อมูลได้
      toast.info('ฟีเจอร์ระงับผู้ใช้จะมาในอนาคต')
    } catch (error) {
      console.error('Error banning user:', error)
      toast.error('ไม่สามารถระงับผู้ใช้ได้')
    }
  }

  // Handle user editing
  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleSaveUser = async (updatedUser: UserProfile) => {
    try {
      await updateUserRole(updatedUser.id, updatedUser.role)
      setUsers(prev => prev.map(u => 
        u.id === updatedUser.id ? updatedUser : u
      ))
      setShowEditModal(false)
      setEditingUser(null)
      toast.success('อัปเดตข้อมูลผู้ใช้สำเร็จ!')
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('ไม่สามารถอัปเดตข้อมูลได้')
    }
  }

  // Handle bulk actions
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.includes(user?.id || '')) {
      toast.error('ไม่สามารถลบตัวเองได้')
      return
    }

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ ${selectedUsers.length} คน?`)) {
      return
    }

    try {
      for (const userId of selectedUsers) {
        await deleteUser(userId)
      }
      setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)))
      setSelectedUsers([])
      toast.success(`ลบผู้ใช้ ${selectedUsers.length} คนสำเร็จ!`)
    } catch (error) {
      console.error('Error bulk deleting users:', error)
      toast.error('ไม่สามารถลบผู้ใช้ได้')
    }
  }

  const handleBulkChangeRole = async (role: 'user' | 'admin') => {
    if (selectedUsers.includes(user?.id || '') && role === 'user') {
      toast.error('ไม่สามารถลดสิทธิ์ตัวเองได้')
      return
    }

    try {
      for (const userId of selectedUsers) {
        await updateUserRole(userId, role)
      }
      setUsers(prev => prev.map(u => 
        selectedUsers.includes(u.id) ? { ...u, role } : u
      ))
      setSelectedUsers([])
      toast.success(`เปลี่ยนสิทธิ์ผู้ใช้ ${selectedUsers.length} คนเป็น ${role} สำเร็จ!`)
    } catch (error) {
      console.error('Error bulk changing role:', error)
      toast.error('ไม่สามารถเปลี่ยนสิทธิ์ได้')
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

  const filteredDesigns = designs.filter(d => {
    const designOwner = users.find(u => u.id === d.user_id)
    return (
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      designOwner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      designOwner?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

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

  // Analytics data
  const getWeeklyStats = () => {
    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const today = new Date()
    const weekData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      
      const usersJoined = users.filter(u => {
        const userDate = new Date(u.created_at)
        return userDate.toDateString() === date.toDateString()
      }).length

      const designsCreated = designs.filter(d => {
        const designDate = new Date(d.created_at)
        return designDate.toDateString() === date.toDateString()
      }).length

      weekData.push({
        day: weekDays[date.getDay()],
        date: date.toLocaleDateString('th-TH'),
        users: usersJoined,
        designs: designsCreated
      })
    }
    return weekData
  }

  const getTopUsers = () => {
    const userDesignCounts = users.map(user => ({
      ...user,
      designCount: designs.filter(d => d.user_id === user.id).length
    }))
    return userDesignCounts
      .sort((a, b) => b.designCount - a.designCount)
      .slice(0, 5)
  }

  const weeklyData = getWeeklyStats()
  const topUsers = getTopUsers()

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearAuthData()
                  window.location.reload()
                }}
                title="ล้าง Cache และรีโหลด"
              >
                🔄 Clear Cache
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
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'analytics' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              สถิติและรายงาน
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
            {/* Bulk Actions Header */}
            {filteredUsers.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length}
                        onCheckedChange={handleSelectAllUsers}
                      />
                      <span className="text-sm font-medium">
                        {selectedUsers.length > 0 
                          ? `เลือกแล้ว ${selectedUsers.length} คน`
                          : 'เลือกทั้งหมด'
                        }
                      </span>
                    </div>
                    
                    {selectedUsers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkChangeRole('admin')}
                        >
                          <Crown className="w-4 h-4 mr-1" />
                          ตั้งเป็น Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkChangeRole('user')}
                        >
                          <User className="w-4 h-4 mr-1" />
                          ตั้งเป็น User
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          ลบที่เลือก
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User List */}
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                      />
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
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            แก้ไข
                          </Button>
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
                            variant="secondary"
                            onClick={() => handleBanUser(user.id)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            ระงับ
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
        ) : activeTab === 'analytics' ? (
          <div className="space-y-8">
            {/* Weekly Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  กิจกรรมรายสัปดาห์
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {weeklyData.map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500 mb-2">{day.day}</div>
                      <div className="space-y-2">
                        <div className="bg-blue-100 rounded-lg p-3">
                          <div className="text-lg font-bold text-blue-600">{day.users}</div>
                          <div className="text-xs text-blue-500">ผู้ใช้ใหม่</div>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-600">{day.designs}</div>
                          <div className="text-xs text-green-500">การ์ดใหม่</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{day.date}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  ผู้ใช้ที่สร้างการ์ดมากที่สุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topUsers.map((topUser, index) => (
                    <div key={topUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {topUser.full_name || 'ไม่ระบุชื่อ'}
                          </div>
                          <div className="text-sm text-gray-600">{topUser.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{topUser.designCount}</div>
                        <div className="text-xs text-gray-500">การ์ด</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  กิจกรรมล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.slice(-5).reverse().map((recentUser) => (
                    <div key={recentUser.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <User className="w-4 h-4 text-gray-500" />
                      <div className="flex-1">
                        <span className="font-medium">{recentUser.full_name || 'ผู้ใช้ใหม่'}</span>
                        <span className="text-gray-600"> สมัครสมาชิก</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(recentUser.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                  ))}
                  
                  {designs.slice(-3).reverse().map((recentDesign) => {
                    const designOwner = users.find(u => u.id === recentDesign.user_id)
                    return (
                      <div key={recentDesign.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <FileImage className="w-4 h-4 text-gray-500" />
                        <div className="flex-1">
                          <span className="font-medium">{designOwner?.full_name || 'ผู้ใช้'}</span>
                          <span className="text-gray-600"> สร้างการ์ด </span>
                          <span className="font-medium">{recentDesign.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(recentDesign.created_at).toLocaleString('th-TH')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
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

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อเต็ม</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    full_name: e.target.value
                  })}
                  placeholder="กรอกชื่อเต็ม"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="bg-gray-100"
                  placeholder="อีเมลไม่สามารถแก้ไขได้"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">บทบาท</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({
                    ...editingUser,
                    role: value as 'user' | 'admin'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={() => editingUser && handleSaveUser(editingUser)}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}