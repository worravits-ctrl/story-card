# Setup Supabase Database

## ขั้นตอนการตั้งค่าฐานข้อมูล Supabase

### 1. สร้าง Project (ทำแล้ว)
- ✅ มี project อยู่แล้วที่ https://dhbcnhxxonomxwynojgf.supabase.co
- ✅ มี API Keys ใน .env แล้ว

### 2. สร้างตารางฐานข้อมูล
ไปที่ Supabase Dashboard → SQL Editor และรันคำสั่ง SQL ใน `supabase/database.sql`

คำสั่ง SQL จะสร้าง:
- ✅ ตาราง `profiles` (ข้อมูลผู้ใช้)
- ✅ ตาราง `card_designs` (การ์ดที่สร้าง) 
- ✅ Row Level Security (RLS) policies
- ✅ Functions และ Triggers
- ✅ Indexes สำหรับ performance

### 3. ตรวจสอบ Authentication Settings
ไปที่ Supabase Dashboard → Authentication → Settings

**Email Settings:**
- ✅ Enable email confirmations = `true` (แนะนำ)
- ✅ Enable email change confirmations = `true`  
- ✅ Enable secure email change = `true`

**Password Settings:**
- ✅ Minimum password length = `6`
- ✅ Password strength = `fair`

### 4. กำหนด Admin User (เสริม)
หลังจากรัน SQL แล้ว ทำตามขั้นตอนนี้:

1. สมัครสมาชิกใหม่ผ่านหน้าเว็บ
2. ไปที่ Supabase Dashboard → Authentication → Users  
3. คัดลอก User ID ของคุณ
4. ไปที่ SQL Editor และรันคำสั่ง:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id-here';
```

### 5. Test Connection
ทดสอบการเชื่อมต่อด้วยการ:
- ✅ สมัครสมาชิกใหม่
- ✅ เข้าสู่ระบบ  
- ✅ สร้างการ์ดและบันทึก
- ✅ ดูการ์ดใน Dashboard

## การใช้งาน

### Multi-User Features
- 🔐 **Authentication**: Email/Password พร้อม email confirmation
- 👥 **User Profiles**: ข้อมูลผู้ใช้ + role management (user/admin)
- 💾 **Online Storage**: บันทึกการ์ดในฐานข้อมูล PostgreSQL
- 🔒 **Security**: Row Level Security ป้องกันข้อมูล
- ⚡ **Real-time**: อัพเดทแบบ real-time (optional)

### Admin Features  
- 👑 **User Management**: ดู/แก้ไข/ลบผู้ใช้
- 📊 **Analytics**: ดูสถิติการใช้งาน
- 🎨 **Design Management**: ดู/ลบการ์ดทั้งหมด
- ⚙️ **System Settings**: กำหนดค่าระบบ

### Database Schema
```
profiles (ขยายจาก auth.users)
├── id (UUID, Primary Key)  
├── email (TEXT)
├── full_name (TEXT)
├── avatar_url (TEXT) 
├── role (user|admin)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

card_designs (การ์ดที่สร้าง)
├── id (UUID, Primary Key)
├── user_id (UUID, Foreign Key)
├── name (TEXT)  
├── width (INTEGER)
├── height (INTEGER)
├── background_color (TEXT)
├── texts (JSONB Array)
├── images (JSONB Array)  
├── is_public (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Environment Variables
```bash
VITE_SUPABASE_URL="https://dhbcnhxxonomxwynojgf.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
```

## ขั้นตอนต่อไป
1. รัน SQL ใน Supabase Dashboard
2. Test สมัครสมาชิกและสร้างการ์ด
3. ตั้ง Admin User  
4. Deploy ขึ้น Railway