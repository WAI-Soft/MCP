# دليل البدء السريع - Cirvoy-Kiro MCP Integration

دليل سريع للبدء في استخدام خادم MCP لمزامنة المهام بين Kiro IDE و Cirvoy في 5 دقائق.

---

## الإعداد السريع (5 دقائق)

### الخطوة 1: التثبيت (دقيقة واحدة)

```bash
# استنساخ المشروع
git clone https://github.com/your-org/cirvoy-kiro-mcp-integration.git
cd cirvoy-kiro-mcp-integration

# تثبيت الحزم
npm install

# بناء المشروع
npm run build
```

### الخطوة 2: إعداد التكوين (دقيقتان)

```bash
# إنشاء مجلد التكوين
mkdir -p ~/.kiro/cirvoy-mcp

# نسخ ملف التكوين النموذجي
cp config/example.config.json ~/.kiro/cirvoy-mcp/config.json

# تحرير التكوين
nano ~/.kiro/cirvoy-mcp/config.json
```

**قم بتحديث هذه القيم الأساسية فقط:**

```json
{
  "cirvoy": {
    "baseURL": "https://your-cirvoy-instance.com/api",
    "apiToken": "your-api-token-from-cirvoy",
    "webhookSecret": "your-webhook-secret-from-cirvoy"
  },
  "storage": {
    "encryptionKey": "قم-بإنشاء-مفتاح-32-حرف-على-الأقل-هنا"
  }
}
```

**نصيحة**: لإنشاء مفتاح تشفير:
```bash
openssl rand -base64 32
```

### الخطوة 3: إضافة إلى Kiro (دقيقة واحدة)

افتح ملف تكوين Kiro:

```bash
nano ~/.kiro/config.json
```

أضف هذا القسم (استبدل المسار بالمسار الفعلي):

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
      }
    }
  }
}
```

**للحصول على المسار الكامل:**
```bash
pwd
# انسخ المسار الناتج واستخدمه في التكوين
```

### الخطوة 4: إعادة تشغيل Kiro (30 ثانية)

1. أغلق Kiro IDE تمامًا
2. افتح Kiro IDE مرة أخرى
3. انتظر حتى يتم تحميل الخادم

### الخطوة 5: التحقق من التشغيل (30 ثانية)

في Kiro IDE:

1. اضغط `Ctrl+Shift+P` (أو `Cmd+Shift+P` على Mac)
2. اكتب: `MCP: List Servers`
3. يجب أن ترى `cirvoy-sync` مع حالة "Running" ✅

---

## الاستخدام الأساسي

### مزامنة المهام من Cirvoy

```typescript
// في Kiro IDE
await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
  projectId: 'your-project-id'
});
```

### مزامنة المهام إلى Cirvoy

```typescript
await mcp.callTool('cirvoy-sync', 'sync_tasks_to_cirvoy', {
  taskIds: ['task-1', 'task-2']
});
```

### التحقق من حالة المزامنة

```typescript
await mcp.callTool('cirvoy-sync', 'get_sync_status', {});
```

---

## استكشاف الأخطاء السريع

### الخادم لا يظهر في القائمة؟

```bash
# تحقق من أن المشروع تم بناؤه
ls -la dist/index.js

# إذا لم يكن موجودًا، قم بالبناء
npm run build
```

### خطأ في المصادقة؟

```bash
# تحقق من ملف التكوين
cat ~/.kiro/cirvoy-mcp/config.json

# تأكد من صحة apiToken و webhookSecret
```

### عرض السجلات

```bash
# عرض سجلات الخادم
tail -f ~/.kiro/cirvoy-mcp/logs/server.log

# أو من داخل Kiro
# Ctrl+Shift+P > MCP: Show Server Logs > cirvoy-sync
```

---

## الأوامر المفيدة

```bash
# بناء المشروع
npm run build

# تشغيل الاختبارات
npm test

# تشغيل في وضع التطوير
npm run dev

# عرض السجلات
tail -f ~/.kiro/cirvoy-mcp/logs/server.log

# إعادة تشغيل الخادم (من داخل Kiro)
# Ctrl+Shift+P > MCP: Restart Server > cirvoy-sync
```

---

## الخطوات التالية

✅ **تم الإعداد بنجاح!** الآن يمكنك:

1. **قراءة الدليل الكامل**: [KIRO_SETUP.md](KIRO_SETUP.md)
2. **استكشاف الأمثلة**: راجع مجلد `examples/`
3. **تخصيص الإعدادات**: اضبط التكوين حسب احتياجاتك
4. **إعداد Webhooks**: قم بتكوين Cirvoy لإرسال الإشعارات

---

## الحصول على المساعدة

- **الوثائق الكاملة**: [KIRO_SETUP.md](KIRO_SETUP.md)
- **README**: [../README.md](../README.md)
- **الأمثلة**: [../examples/](../examples/)
- **المشاكل**: [GitHub Issues](https://github.com/your-org/cirvoy-kiro-mcp-integration/issues)

---

## نصائح للأداء الأفضل

### 1. تحسين المزامنة

```json
{
  "server": {
    "syncInterval": 5,
    "maxRetries": 3
  },
  "performance": {
    "batchSize": 20,
    "maxConcurrentSyncs": 10
  }
}
```

### 2. تفعيل السجلات التفصيلية (للتطوير)

```json
{
  "logging": {
    "level": "debug"
  }
}
```

### 3. استخدام متغيرات البيئة للأمان

في ملف تكوين Kiro:

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CIRVOY_API_TOKEN": "your-token",
        "STORAGE_ENCRYPTION_KEY": "your-key"
      }
    }
  }
}
```

---

## الأمان السريع

```bash
# قيد صلاحيات ملف التكوين
chmod 600 ~/.kiro/cirvoy-mcp/config.json

# قيد صلاحيات المجلد
chmod 700 ~/.kiro/cirvoy-mcp/
```

---

**مبروك! 🎉** أنت الآن جاهز لاستخدام Cirvoy-Kiro MCP Integration!
