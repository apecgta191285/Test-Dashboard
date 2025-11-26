# 🚀 Quick Start Guide - RGA Dashboard Backend

## ขั้นตอนการติดตั้งและรัน (Windows)

### 1. ติดตั้ง Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Setup Database

\`\`\`bash
# Generate Prisma Client
npx prisma generate

# Create database และ run migrations
npx prisma migrate dev --name init
\`\`\`

### 3. รัน Development Server

\`\`\`bash
npm run start:dev
\`\`\`

✅ Server จะรันที่ `http://localhost:3000`  
✅ Swagger docs: `http://localhost:3000/api/docs`

---

## 🧪 ทดสอบ API

### 1. Register (สร้าง account ใหม่)

\`\`\`bash
curl -X POST http://localhost:3000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"password123\",\"name\":\"Admin\",\"companyName\":\"My Company\"}"
\`\`\`

### 2. Login

\`\`\`bash
curl -X POST http://localhost:3000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"password123\"}"
\`\`\`

คัดลอก `accessToken` ที่ได้

### 3. เรียกใช้ Protected Endpoint

\`\`\`bash
curl http://localhost:3000/api/v1/users ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
\`\`\`

---

## 🎯 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1` | Health check | ❌ |
| POST | `/api/v1/auth/register` | Register | ❌ |
| POST | `/api/v1/auth/login` | Login | ❌ |
| GET | `/api/v1/users` | Get users | ✅ |
| GET | `/api/v1/campaigns` | Get campaigns | ✅ |
| GET | `/api/v1/dashboard/overview` | Dashboard overview | ✅ |

---

## 💡 Tips

1. **ใช้ Swagger UI** - ทดสอบ API ได้ง่ายที่สุดที่ `http://localhost:3000/api/docs`
2. **ใช้ Prisma Studio** - ดูข้อมูลใน database ด้วย `npx prisma studio`
3. **ดู logs** - ตรวจสอบ console เมื่อรัน `npm run start:dev`

---

## 🔧 คำสั่งที่ใช้บ่อย

\`\`\`bash
# Build โปรเจ็ค
npm run build

# รัน production
npm run start:prod

# ดู database ด้วย Prisma Studio
npx prisma studio

# สร้าง migration ใหม่
npx prisma migrate dev --name migration_name
\`\`\`

---

## ❓ แก้ปัญหา

### ถ้า build ไม่ผ่าน
\`\`\`bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules
npm install
\`\`\`

### ถ้า database มีปัญหา
\`\`\`bash
# Reset database
npx prisma migrate reset
\`\`\`

---

**🎉 พร้อมใช้งานแล้ว! Happy Coding!**
