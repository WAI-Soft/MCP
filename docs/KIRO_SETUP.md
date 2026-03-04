# دليل إعداد Cirvoy-Kiro MCP Server في Kiro IDE

دليل شامل لإضافة وتكوين خادم MCP لمزامنة المهام بين Kiro IDE ونظام إدارة المشاريع Cirvoy.

## المحتويات

1. [المتطلبات الأساسية](#المتطلبات-الأساسية)
2. [التثبيت](#التثبيت)
3. [إعداد ملف التكوين](#إعداد-ملف-التكوين)
4. [إضافة الخادم إلى Kiro](#إضافة-الخادم-إلى-kiro)
5. [تشغيل الخادم](#تشغيل-الخادم)
6. [استخدام الأدوات](#استخدام-الأدوات)
7. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## المتطلبات الأساسية

قبل البدء، تأكد من توفر المتطلبات التالية:

- **Node.js**: الإصدار 18 أو أحدث
- **Kiro IDE**: مثبت ويعمل على جهازك
- **حساب Cirvoy**: مع صلاحيات الوصول إلى API
- **رمز API**: احصل عليه من إعدادات حسابك في Cirvoy
- **سر Webhook**: قم بإنشائه في إعدادات Cirvoy

### التحقق من إصدار Node.js

```bash
node --version
# يجب أن يكون v18.0.0 أو أحدث
```

---

## التثبيت

### 1. استنساخ المشروع أو تنزيله

```bash
git clone https://github.com/your-org/cirvoy-kiro-mcp-integration.git
cd cirvoy-kiro-mcp-integration
```

### 2. تثبيت الحزم المطلوبة

```bash
npm install
```

### 3. بناء المشروع

```bash
npm run build
```

سيتم إنشاء الملفات المبنية في مجلد `dist/`.

---

## إعداد ملف التكوين

### 1. إنشاء مجلد التكوين

```bash
mkdir -p ~/.kiro/cirvoy-mcp
```

### 2. نسخ ملف التكوين النموذجي

```bash
cp config/example.config.json ~/.kiro/cirvoy-mcp/config.json
```

### 3. تحرير ملف التكوين

افتح الملف للتحرير:

```bash
nano ~/.kiro/cirvoy-mcp/config.json
```

أو استخدم محرر النصوص المفضل لديك.

### 4. تكوين الإعدادات المطلوبة

قم بتحديث القيم التالية في ملف التكوين:

```json
{
  "cirvoy": {
    "baseURL": "https://your-cirvoy-instance.com/api",
    "apiToken": "your-actual-api-token",
    "webhookSecret": "your-webhook-secret",
    "timeout": 30000
  },
  "server": {
    "webhookPort": 3000,
    "syncInterval": 5,
    "maxRetries": 3,
    "retryBackoffMs": 1000
  },
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite",
    "encryptionKey": "your-32-character-encryption-key-here-minimum-length"
  },
  "logging": {
    "level": "info",
    "filePath": "~/.kiro/cirvoy-mcp/logs/server.log"
  },
  "performance": {
    "maxMemoryMB": 100,
    "batchSize": 10,
    "maxConcurrentSyncs": 5
  }
}
```

#### شرح الحقول المطلوبة

| الحقل | الوصف | مثال |
|------|-------|------|
| `cirvoy.baseURL` | عنوان URL الأساسي لـ API الخاص بـ Cirvoy | `https://cirvoy.example.com/api` |
| `cirvoy.apiToken` | رمز المصادقة للوصول إلى API | احصل عليه من إعدادات Cirvoy |
| `cirvoy.webhookSecret` | المفتاح السري للتحقق من توقيعات Webhook | قم بإنشائه في إعدادات Cirvoy |
| `cirvoy.timeout` | مهلة الطلبات بالميلي ثانية (1000-60000) | `30000` |
| `storage.dbPath` | مسار قاعدة بيانات SQLite | `~/.kiro/cirvoy-mcp/database.sqlite` |
| `storage.encryptionKey` | مفتاح التشفير (32 حرفًا على الأقل) | قم بإنشاء مفتاح عشوائي قوي |

### 5. إنشاء مفتاح تشفير آمن

يمكنك إنشاء مفتاح تشفير عشوائي باستخدام:

```bash
# على Linux/macOS
openssl rand -base64 32

# أو باستخدام Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. تشفير البيانات الحساسة (اختياري)

لمزيد من الأمان، يمكنك تشفير رموز API:

```bash
npm run build
node examples/encrypt-credentials-example.ts
```

اتبع التعليمات لتشفير `apiToken` و `webhookSecret`.

---

## إضافة الخادم إلى Kiro

### الطريقة 1: إضافة يدوية إلى ملف التكوين

1. افتح ملف تكوين Kiro:

```bash
nano ~/.kiro/config.json
```

2. أضف خادم MCP إلى قسم `mcpServers`:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": [
        "/المسار/الكامل/إلى/cirvoy-kiro-mcp-integration/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      },
      "disabled": false
    }
  }
}
```

**ملاحظة**: استبدل `/المسار/الكامل/إلى/` بالمسار الفعلي للمشروع على جهازك.

### الطريقة 2: استخدام المسار النسبي

إذا كان المشروع في مجلد معين، يمكنك استخدام:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": [
        "${HOME}/projects/cirvoy-kiro-mcp-integration/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "STORAGE_ENCRYPTION_KEY": "your-encryption-key-here"
      }
    }
  }
}
```

### الطريقة 3: استخدام npm global (بعد النشر)

إذا تم نشر الحزمة على npm:

```bash
npm install -g cirvoy-kiro-mcp-integration
```

ثم في ملف تكوين Kiro:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "cirvoy-kiro-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

### تكوين متقدم مع متغيرات البيئة

يمكنك تجاوز إعدادات التكوين باستخدام متغيرات البيئة:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": [
        "/path/to/cirvoy-kiro-mcp-integration/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "CIRVOY_BASE_URL": "https://cirvoy.example.com/api",
        "CIRVOY_API_TOKEN": "your-token",
        "CIRVOY_WEBHOOK_SECRET": "your-secret",
        "SERVER_WEBHOOK_PORT": "3000",
        "LOGGING_LEVEL": "debug"
      }
    }
  }
}
```

---

## تشغيل الخادم

### 1. إعادة تشغيل Kiro IDE

بعد إضافة التكوين، أعد تشغيل Kiro IDE لتحميل خادم MCP الجديد.

### 2. التحقق من تشغيل الخادم

افتح لوحة الأوامر في Kiro (Ctrl+Shift+P أو Cmd+Shift+P) واكتب:

```
MCP: List Servers
```

يجب أن ترى `cirvoy-sync` في القائمة مع حالة "Running".

### 3. عرض سجلات الخادم

لعرض سجلات الخادم:

```bash
tail -f ~/.kiro/cirvoy-mcp/logs/server.log
```

أو من داخل Kiro:

```
MCP: Show Server Logs > cirvoy-sync
```

### 4. اختبار الاتصال

يمكنك اختبار الاتصال بـ Cirvoy من خلال:

```bash
# من مجلد المشروع
npm start
```

يجب أن ترى رسالة تأكيد الاتصال في السجلات.

---

## استخدام الأدوات

بعد تشغيل الخادم بنجاح، يمكنك استخدام أدوات MCP من داخل Kiro.

### الأدوات المتاحة

#### 1. مزامنة المهام من Cirvoy إلى Kiro

```typescript
// في Kiro IDE
await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
  projectId: 'project-123'
});
```

#### 2. مزامنة المهام من Kiro إلى Cirvoy

```typescript
await mcp.callTool('cirvoy-sync', 'sync_tasks_to_cirvoy', {
  taskIds: ['task-1', 'task-2']
});
```

#### 3. الحصول على حالة المزامنة

```typescript
await mcp.callTool('cirvoy-sync', 'get_sync_status', {});
```

#### 4. حل التعارضات

```typescript
await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
  conflictId: 'conflict-123',
  resolution: 'use_cirvoy' // أو 'use_kiro'
});
```

### استخدام الأدوات من واجهة Kiro

1. افتح لوحة الأوامر (Ctrl+Shift+P)
2. اكتب: `MCP: Execute Tool`
3. اختر `cirvoy-sync`
4. اختر الأداة المطلوبة
5. أدخل المعاملات المطلوبة

### أمثلة عملية

#### مثال 1: مزامنة مشروع كامل

```typescript
// مزامنة جميع مهام مشروع معين
const result = await mcp.callTool('cirvoy-sync', 'sync_project', {
  projectId: 'my-project-id',
  direction: 'bidirectional' // أو 'from_cirvoy' أو 'to_cirvoy'
});

console.log(`تم مزامنة ${result.syncedTasks} مهمة`);
```

#### مثال 2: مراقبة التغييرات في الوقت الفعلي

الخادم يستقبل تلقائيًا إشعارات Webhook من Cirvoy ويحدث المهام في Kiro.

---

## استكشاف الأخطاء

### المشكلة: الخادم لا يبدأ

**الأعراض**: لا يظهر `cirvoy-sync` في قائمة الخوادم

**الحلول**:

1. تحقق من صحة مسار الملف في التكوين:
   ```bash
   ls -la /path/to/cirvoy-kiro-mcp-integration/dist/index.js
   ```

2. تحقق من أن المشروع تم بناؤه:
   ```bash
   cd cirvoy-kiro-mcp-integration
   npm run build
   ```

3. تحقق من سجلات Kiro:
   ```
   ~/.kiro/logs/mcp-servers.log
   ```

### المشكلة: خطأ في المصادقة

**الأعراض**: رسائل خطأ "Authentication failed" أو "Invalid API token"

**الحلول**:

1. تحقق من صحة `apiToken` في ملف التكوين
2. تأكد من أن الرمز لم تنته صلاحيته في Cirvoy
3. تحقق من أن الرمز لديه الصلاحيات المطلوبة

### المشكلة: فشل التحقق من Webhook

**الأعراض**: رسائل "Webhook signature verification failed"

**الحلول**:

1. تحقق من أن `webhookSecret` يطابق السر في إعدادات Cirvoy
2. تأكد من أن المنفذ `webhookPort` غير مستخدم من تطبيق آخر:
   ```bash
   lsof -i :3000
   ```

3. تحقق من إعدادات جدار الحماية

### المشكلة: خطأ في قاعدة البيانات

**الأعراض**: رسائل "Database error" أو "Cannot open database"

**الحلول**:

1. تحقق من صلاحيات المجلد:
   ```bash
   ls -la ~/.kiro/cirvoy-mcp/
   ```

2. أنشئ المجلد إذا لم يكن موجودًا:
   ```bash
   mkdir -p ~/.kiro/cirvoy-mcp
   chmod 755 ~/.kiro/cirvoy-mcp
   ```

3. احذف قاعدة البيانات وأعد إنشاءها:
   ```bash
   rm ~/.kiro/cirvoy-mcp/database.sqlite
   # ثم أعد تشغيل الخادم
   ```

### المشكلة: خطأ في فك التشفير

**الأعراض**: "Decryption failed" أو "Invalid encryption key"

**الحلول**:

1. تحقق من أن `encryptionKey` يحتوي على 32 حرفًا على الأقل
2. إذا قمت بتغيير المفتاح، أعد تشفير البيانات الحساسة
3. تأكد من عدم وجود مسافات إضافية في المفتاح

### المشكلة: بطء المزامنة

**الأعراض**: المزامنة تستغرق وقتًا طويلاً

**الحلول**:

1. قلل `syncInterval` في التكوين (لكن لا تجعله أقل من 1 ثانية)
2. زد `maxConcurrentSyncs` لمزامنة متوازية أكثر
3. زد `batchSize` لمعالجة مهام أكثر في كل دفعة

### المشكلة: استهلاك عالي للذاكرة

**الأعراض**: الخادم يستهلك ذاكرة كبيرة

**الحلول**:

1. قلل `maxMemoryMB` في التكوين
2. قلل `batchSize` لمعالجة مهام أقل في كل مرة
3. قلل `maxConcurrentSyncs`

### تفعيل وضع التصحيح

لمزيد من المعلومات التفصيلية:

```json
{
  "logging": {
    "level": "debug",
    "filePath": "~/.kiro/cirvoy-mcp/logs/server.log"
  }
}
```

ثم أعد تشغيل الخادم وراقب السجلات:

```bash
tail -f ~/.kiro/cirvoy-mcp/logs/server.log
```

---

## الدعم والمساعدة

### الموارد

- **الوثائق الكاملة**: راجع ملف [README.md](../README.md)
- **دليل البدء السريع**: راجع [QUICK_START.md](QUICK_START.md)
- **أمثلة الاستخدام**: راجع مجلد [examples/](../examples/)

### الإبلاغ عن المشاكل

إذا واجهت مشكلة لم يتم ذكرها هنا:

1. تحقق من السجلات للحصول على تفاصيل الخطأ
2. ابحث في قضايا GitHub الموجودة
3. أنشئ قضية جديدة مع:
   - وصف المشكلة
   - خطوات إعادة الإنتاج
   - رسائل الخطأ من السجلات
   - إصدار Node.js ونظام التشغيل

---

## الخطوات التالية

بعد إعداد الخادم بنجاح:

1. **اقرأ دليل البدء السريع**: [QUICK_START.md](QUICK_START.md)
2. **استكشف الأمثلة**: راجع مجلد `examples/` للأمثلة العملية
3. **تخصيص التكوين**: اضبط الإعدادات حسب احتياجاتك
4. **إعداد Webhooks**: قم بتكوين Cirvoy لإرسال إشعارات إلى الخادم

---

## الأمان

### أفضل الممارسات

1. **لا تشارك ملف التكوين**: يحتوي على بيانات حساسة
2. **استخدم التشفير**: قم بتشفير `apiToken` و `webhookSecret`
3. **قم بتخزين مفتاح التشفير بشكل آمن**: استخدم متغيرات البيئة
4. **قم بتحديث الرموز بانتظام**: غير `apiToken` و `webhookSecret` دوريًا
5. **قيد صلاحيات الملفات**:
   ```bash
   chmod 600 ~/.kiro/cirvoy-mcp/config.json
   chmod 700 ~/.kiro/cirvoy-mcp/
   ```

---

## الترخيص

هذا المشروع مرخص بموجب رخصة MIT. راجع ملف LICENSE للتفاصيل.
