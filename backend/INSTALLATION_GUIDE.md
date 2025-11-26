# 📦 คู่มือการติดตั้งและใช้งาน RGA Dashboard Backend

## 🎯 ข้อกำหนดเบื้องต้น

- **Node.js** เวอร์ชัน 18 หรือสูงกว่า
- **npm** หรือ **yarn**
- **Git** (ถ้าต้องการ clone จาก repository)

---

## 🚀 ขั้นตอนการติดตั้ง

### **Step 1: แตกไฟล์โปรเจ็ค**

แตกไฟล์ `rga-dashboard-backend-complete.tar.gz` ที่คุณดาวน์โหลดมา:

**Windows:**
- ใช้ 7-Zip หรือ WinRAR แตกไฟล์
- หรือใช้ WSL: `tar -xzf rga-dashboard-backend-complete.tar.gz`

**macOS/Linux:**
```bash
tar -xzf rga-dashboard-backend-complete.tar.gz
```

### **Step 2: เข้าไปในโฟลเดอร์โปรเจ็ค**

```bash
cd rga-dashboard-backend
```

### **Step 3: ติดตั้ง Dependencies**

```bash
npm install
```

หรือถ้าใช้ yarn:
```bash
yarn install
```

### **Step 4: ตั้งค่า Environment Variables**

สร้างไฟล์ `.env` จากไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ตามต้องการ (ค่า default ใช้งานได้เลย):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### **Step 5: ตั้งค่า Database**

รัน Prisma migrations:

```bash
npx prisma migrate dev --name init
```

### **Step 6: Seed Database (สร้างข้อมูลทดสอบ)**

```bash
npx ts-node prisma/seed.ts
```

ข้อมูลที่จะถูกสร้าง:
- **Tenant:** Demo Company
- **Users:**
  - `admin@test.com` / `password123` (ADMIN)
  - `client@test.com` / `password123` (CLIENT)
- **Campaigns:** 5 campaigns
- **Metrics:** 30 วันย้อนหลังสำหรับแต่ละ campaign

---

## ▶️ การรันโปรเจ็ค

### **Development Mode (แนะนำ)**

```bash
npm run start:dev
```

Server จะรันที่ `http://localhost:3000`

### **Production Mode**

```bash
npm run build
npm run start:prod
```

---

## 🧪 การทดสอบ

### **รัน E2E Tests**

```bash
npm run test:e2e
```

ผลลัพธ์ที่คาดหวัง:
```
Test Suites: 3 passed, 3 total
Tests:       43 passed, 43 total
```

---

## 📡 API Endpoints

### **Authentication**

- `POST /api/v1/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/v1/auth/login` - เข้าสู่ระบบ

### **Dashboard**

- `GET /api/v1/dashboard/overview` - ภาพรวม KPIs
- `GET /api/v1/dashboard/charts/time-series` - ข้อมูล time series
- `GET /api/v1/dashboard/charts/platform-comparison` - เปรียบเทียบ platforms
- `GET /api/v1/dashboard/charts/top-campaigns` - Top campaigns

### **Campaigns**

- `POST /api/v1/campaigns` - สร้าง campaign
- `GET /api/v1/campaigns` - ดึงรายการ campaigns
- `GET /api/v1/campaigns/:id` - ดึง campaign เดียว
- `PUT /api/v1/campaigns/:id` - อัพเดท campaign
- `DELETE /api/v1/campaigns/:id` - ลบ campaign
- `GET /api/v1/campaigns/:id/metrics` - ดึง metrics

### **Users (Admin only)**

- `POST /api/v1/users` - สร้าง user
- `GET /api/v1/users` - ดึงรายการ users
- `GET /api/v1/users/:id` - ดึง user เดียว
- `PUT /api/v1/users/:id` - อัพเดท user
- `DELETE /api/v1/users/:id` - ลบ user

---

## 📝 ตัวอย่างการใช้งาน API

### **1. Login**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **2. ดึงข้อมูล Dashboard**

```bash
curl -X GET http://localhost:3000/api/v1/dashboard/overview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### **3. ดึงรายการ Campaigns**

```bash
curl -X GET http://localhost:3000/api/v1/campaigns \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📚 Swagger Documentation

เมื่อ server รันแล้ว สามารถเข้าถึง Swagger UI ได้ที่:

```
http://localhost:3000/api/docs
```

---

## 🔧 คำสั่งที่มีประโยชน์

```bash
# ดู Prisma Studio (Database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Reset Database
npx prisma migrate reset

# Build โปรเจ็ค
npm run build

# รัน tests
npm test
```

---

## ❓ แก้ปัญหา

### **ปัญหา: Port 3000 ถูกใช้งานแล้ว**

แก้ไข `PORT` ในไฟล์ `.env`:
```env
PORT=3001
```

### **ปัญหา: Database migration ล้มเหลว**

ลบ database และสร้างใหม่:
```bash
rm prisma/dev.db
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### **ปัญหา: bcrypt compilation error**

Rebuild bcrypt:
```bash
npm rebuild bcrypt
```

---

## 🎉 เสร็จสิ้น!

ตอนนี้โปรเจ็คของคุณพร้อมใช้งานแล้ว! 🚀
