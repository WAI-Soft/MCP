# دليل استكشاف الأخطاء - Cirvoy-Kiro MCP Server

دليل شامل لحل المشاكل الشائعة وتشخيص الأخطاء.

---

## جدول المحتويات

1. [مشاكل بدء التشغيل](#مشاكل-بدء-التشغيل)
2. [مشاكل الاتصال](#مشاكل-الاتصال)
3. [مشاكل المصادقة](#مشاكل-المصادقة)
4. [مشاكل المزامنة](#مشاكل-المزامنة)
5. [مشاكل قاعدة البيانات](#مشاكل-قاعدة-البيانات)
6. [مشاكل الأداء](#مشاكل-الأداء)
7. [مشاكل Webhook](#مشاكل-webhook)
8. [أدوات التشخيص](#أدوات-التشخيص)

---

## مشاكل بدء التشغيل

### المشكلة 1: الخادم لا يظهر في قائمة Kiro

**الأعراض:**
- عند تنفيذ `MCP: List Servers` لا يظهر `cirvoy-sync`
- لا توجد رسائل خطأ واضحة

**الأسباب المحتملة:**
1. مسار الملف غير صحيح في تكوين Kiro
2. المشروع لم يتم بناؤه
3. خطأ في صيغة ملف تكوين Kiro

**الحلول:**

#### الحل 1: التحقق من المسار

```bash
# تحقق من وجود الملف
ls -la /path/to/cirvoy-kiro-mcp-integration/dist/index.js

# إذا لم يكن موجودًا، قم بالبناء
cd cirvoy-kiro-mcp-integration
npm run build
```

#### الحل 2: التحقق من تكوين Kiro

```bash
# افتح ملف التكوين
nano ~/.kiro/config.json

# تأكد من الصيغة الصحيحة
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": [
        "/المسار/الكامل/الصحيح/dist/index.js"
      ]
    }
  }
}
```

#### الحل 3: الحصول على المسار الصحيح

```bash
cd cirvoy-kiro-mcp-integration
pwd
# انسخ المسار الناتج واستخدمه في التكوين
```

#### الحل 4: التحقق من صحة JSON

```bash
# استخدم أداة للتحقق من صحة JSON
cat ~/.kiro/config.json | python -m json.tool
```

---

### المشكلة 2: الخادم يبدأ ثم يتوقف فورًا

**الأعراض:**
- الخادم يظهر في القائمة لثوانٍ ثم يختفي
- حالة الخادم تتحول إلى "Stopped" أو "Error"

**الأسباب المحتملة:**
1. خطأ في ملف التكوين
2. حقول مطلوبة مفقودة
3. قيم غير صالحة في التكوين

**الحلول:**

#### الحل 1: عرض سجلات الخادم

```bash
# من سطر الأوامر
tail -f ~/.kiro/cirvoy-mcp/logs/server.log

# أو من داخل Kiro
# Ctrl+Shift+P > MCP: Show Server Logs > cirvoy-sync
```

#### الحل 2: التحقق من ملف التكوين

```bash
# تحقق من وجود الملف
ls -la ~/.kiro/cirvoy-mcp/config.json

# إذا لم يكن موجودًا، أنشئه
mkdir -p ~/.kiro/cirvoy-mcp
cp config/example.config.json ~/.kiro/cirvoy-mcp/config.json
```

#### الحل 3: التحقق من صحة التكوين

```bash
# تشغيل الخادم يدويًا لرؤية الأخطاء
cd cirvoy-kiro-mcp-integration
npm start
```

---

### المشكلة 3: خطأ "Cannot find module"

**الأعراض:**
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**الحل:**

```bash
cd cirvoy-kiro-mcp-integration
npm install
npm run build
```

---

## مشاكل الاتصال

### المشكلة 1: فشل الاتصال بـ Cirvoy API

**الأعراض:**
```
Error: connect ECONNREFUSED
Error: getaddrinfo ENOTFOUND cirvoy.example.com
```

**الحلول:**

#### الحل 1: التحقق من URL

```bash
# تحقق من التكوين
cat ~/.kiro/cirvoy-mcp/config.json | grep baseURL

# اختبر الاتصال
curl https://your-cirvoy-instance.com/api/health
```

#### الحل 2: التحقق من الشبكة

```bash
# اختبر الاتصال بالإنترنت
ping google.com

# اختبر DNS
nslookup your-cirvoy-instance.com

# اختبر الوصول إلى المنفذ
telnet your-cirvoy-instance.com 443
```

#### الحل 3: التحقق من جدار الحماية

```bash
# على Linux
sudo ufw status

# على macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

---

### المشكلة 2: انتهاء مهلة الطلبات (Timeout)

**الأعراض:**
```
Error: timeout of 30000ms exceeded
```

**الحلول:**

#### الحل 1: زيادة المهلة

```json
{
  "cirvoy": {
    "timeout": 60000
  }
}
```

#### الحل 2: التحقق من سرعة الشبكة

```bash
# اختبر سرعة الاتصال
curl -w "@-" -o /dev/null -s https://your-cirvoy-instance.com/api << 'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF
```

---

## مشاكل المصادقة

### المشكلة 1: خطأ "Authentication failed"

**الأعراض:**
```
Error: Authentication failed: Invalid API token
Status: 401 Unauthorized
```

**الحلول:**

#### الحل 1: التحقق من الرمز

```bash
# عرض الرمز الحالي (احذر: حساس!)
cat ~/.kiro/cirvoy-mcp/config.json | grep apiToken
```

#### الحل 2: الحصول على رمز جديد

1. سجل الدخول إلى Cirvoy
2. اذهب إلى Settings > API Tokens
3. أنشئ رمزًا جديدًا
4. انسخه إلى ملف التكوين

#### الحل 3: التحقق من التشفير

إذا كان الرمز مشفرًا:

```bash
# تأكد من صحة مفتاح التشفير
# قم بفك تشفير الرمز يدويًا للتحقق
node examples/encrypt-credentials-example.ts
```

---

### المشكلة 2: الرمز انتهت صلاحيته

**الأعراض:**
```
Error: Token expired
Status: 401 Unauthorized
```

**الحل:**

```bash
# احصل على رمز جديد من Cirvoy
# ثم حدث التكوين
nano ~/.kiro/cirvoy-mcp/config.json
```

---

## مشاكل المزامنة

### المشكلة 1: المهام لا تتزامن

**الأعراض:**
- التغييرات في Kiro لا تظهر في Cirvoy
- التغييرات في Cirvoy لا تظهر في Kiro

**الحلول:**

#### الحل 1: التحقق من حالة المزامنة

```typescript
// في Kiro IDE
await mcp.callTool('cirvoy-sync', 'get_sync_status', {});
```

#### الحل 2: مزامنة يدوية

```typescript
// مزامنة من Cirvoy
await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
  projectId: 'your-project-id'
});

// مزامنة إلى Cirvoy
await mcp.callTool('cirvoy-sync', 'sync_tasks_to_cirvoy', {
  taskIds: ['task-1', 'task-2']
});
```

#### الحل 3: التحقق من السجلات

```bash
tail -f ~/.kiro/cirvoy-mcp/logs/server.log | grep -i sync
```

---

### المشكلة 2: تعارضات في المزامنة

**الأعراض:**
```
Warning: Sync conflict detected for task-123
```

**الحل:**

```typescript
// عرض التعارضات
await mcp.callTool('cirvoy-sync', 'list_conflicts', {});

// حل التعارض
await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
  conflictId: 'conflict-123',
  resolution: 'use_cirvoy' // أو 'use_kiro'
});
```

---

### المشكلة 3: المزامنة بطيئة جدًا

**الأعراض:**
- المزامنة تستغرق دقائق
- الخادم يبدو بطيئًا

**الحلول:**

#### الحل 1: تحسين إعدادات الأداء

```json
{
  "server": {
    "syncInterval": 3
  },
  "performance": {
    "batchSize": 50,
    "maxConcurrentSyncs": 10
  }
}
```

#### الحل 2: التحقق من استخدام الموارد

```bash
# على Linux/macOS
top -p $(pgrep -f "cirvoy-kiro-mcp")

# أو استخدم htop
htop -p $(pgrep -f "cirvoy-kiro-mcp")
```

---

## مشاكل قاعدة البيانات

### المشكلة 1: خطأ "Cannot open database"

**الأعراض:**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**الحلول:**

#### الحل 1: التحقق من المسار والصلاحيات

```bash
# تحقق من وجود المجلد
ls -la ~/.kiro/cirvoy-mcp/

# إذا لم يكن موجودًا، أنشئه
mkdir -p ~/.kiro/cirvoy-mcp
chmod 755 ~/.kiro/cirvoy-mcp
```

#### الحل 2: التحقق من مساحة القرص

```bash
# تحقق من المساحة المتاحة
df -h ~
```

---

### المشكلة 2: قاعدة البيانات تالفة

**الأعراض:**
```
Error: SQLITE_CORRUPT: database disk image is malformed
```

**الحل:**

```bash
# احتفظ بنسخة احتياطية
cp ~/.kiro/cirvoy-mcp/database.sqlite ~/.kiro/cirvoy-mcp/database.sqlite.backup

# احذف القاعدة التالفة
rm ~/.kiro/cirvoy-mcp/database.sqlite

# أعد تشغيل الخادم (سيتم إنشاء قاعدة جديدة)
# ثم قم بمزامنة البيانات من Cirvoy
```

---

### المشكلة 3: قاعدة البيانات كبيرة جدًا

**الأعراض:**
- ملف database.sqlite حجمه عدة جيجابايت
- الأداء بطيء

**الحل:**

```bash
# تحقق من حجم القاعدة
ls -lh ~/.kiro/cirvoy-mcp/database.sqlite

# تنظيف السجلات القديمة (سيتم تنفيذه من الخادم)
# أو احذف القاعدة وأعد المزامنة
```

---

## مشاكل الأداء

### المشكلة 1: استهلاك عالي للذاكرة

**الأعراض:**
- الخادم يستهلك أكثر من 500 MB
- النظام يصبح بطيئًا

**الحلول:**

#### الحل 1: تقليل حدود الذاكرة

```json
{
  "performance": {
    "maxMemoryMB": 100,
    "batchSize": 10,
    "maxConcurrentSyncs": 3
  }
}
```

#### الحل 2: مراقبة الاستخدام

```bash
# على Linux
ps aux | grep cirvoy-kiro-mcp

# على macOS
ps -m -o pid,rss,command | grep cirvoy-kiro-mcp
```

---

### المشكلة 2: استهلاك عالي للمعالج

**الأعراض:**
- المعالج يعمل بنسبة 100%
- الجهاز يسخن

**الحلول:**

#### الحل 1: زيادة فترة المزامنة

```json
{
  "server": {
    "syncInterval": 30
  }
}
```

#### الحل 2: تقليل العمليات المتزامنة

```json
{
  "performance": {
    "maxConcurrentSyncs": 2
  }
}
```

---

## مشاكل Webhook

### المشكلة 1: فشل التحقق من توقيع Webhook

**الأعراض:**
```
Error: Webhook signature verification failed
Status: 401 Unauthorized
```

**الحلول:**

#### الحل 1: التحقق من السر

```bash
# تحقق من webhookSecret في التكوين
cat ~/.kiro/cirvoy-mcp/config.json | grep webhookSecret

# تأكد من أنه يطابق السر في إعدادات Cirvoy
```

#### الحل 2: إعادة إنشاء السر

1. في Cirvoy: Settings > Webhooks > Regenerate Secret
2. انسخ السر الجديد
3. حدث ملف التكوين
4. أعد تشغيل الخادم

---

### المشكلة 2: المنفذ مستخدم من تطبيق آخر

**الأعراض:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**الحلول:**

#### الحل 1: تغيير المنفذ

```json
{
  "server": {
    "webhookPort": 3001
  }
}
```

#### الحل 2: إيقاف التطبيق الآخر

```bash
# ابحث عن التطبيق الذي يستخدم المنفذ
lsof -i :3000

# أوقف التطبيق
kill -9 <PID>
```

---

## أدوات التشخيص

### 1. تفعيل وضع التصحيح

```json
{
  "logging": {
    "level": "debug",
    "filePath": "~/.kiro/cirvoy-mcp/logs/debug.log"
  }
}
```

### 2. اختبار الاتصال بـ API

```bash
# اختبار بسيط
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     https://your-cirvoy-instance.com/api/health

# اختبار مفصل
curl -v -H "Authorization: Bearer YOUR_API_TOKEN" \
     https://your-cirvoy-instance.com/api/tasks
```

### 3. فحص قاعدة البيانات

```bash
# افتح قاعدة البيانات
sqlite3 ~/.kiro/cirvoy-mcp/database.sqlite

# عرض الجداول
.tables

# عرض عدد المهام
SELECT COUNT(*) FROM tasks;

# عرض السجلات الأخيرة
SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10;

# الخروج
.quit
```

### 4. مراقبة السجلات في الوقت الفعلي

```bash
# عرض جميع السجلات
tail -f ~/.kiro/cirvoy-mcp/logs/server.log

# عرض الأخطاء فقط
tail -f ~/.kiro/cirvoy-mcp/logs/server.log | grep -i error

# عرض المزامنة فقط
tail -f ~/.kiro/cirvoy-mcp/logs/server.log | grep -i sync
```

### 5. اختبار التشفير

```bash
cd cirvoy-kiro-mcp-integration
node examples/encrypt-credentials-example.ts
```

### 6. التحقق من إصدار Node.js

```bash
node --version
# يجب أن يكون v18.0.0 أو أحدث
```

### 7. التحقق من الحزم المثبتة

```bash
cd cirvoy-kiro-mcp-integration
npm list --depth=0
```

---

## سيناريوهات شائعة

### السيناريو 1: إعداد جديد لا يعمل

**خطوات التشخيص:**

```bash
# 1. تحقق من Node.js
node --version

# 2. تحقق من البناء
cd cirvoy-kiro-mcp-integration
npm run build
ls -la dist/index.js

# 3. تحقق من التكوين
cat ~/.kiro/cirvoy-mcp/config.json

# 4. اختبر يدويًا
npm start

# 5. تحقق من السجلات
tail -f ~/.kiro/cirvoy-mcp/logs/server.log
```

---

### السيناريو 2: كان يعمل ثم توقف

**خطوات التشخيص:**

```bash
# 1. تحقق من السجلات للأخطاء الأخيرة
tail -100 ~/.kiro/cirvoy-mcp/logs/server.log

# 2. تحقق من صلاحية الرمز
# سجل الدخول إلى Cirvoy وتحقق من الرمز

# 3. تحقق من مساحة القرص
df -h ~

# 4. تحقق من قاعدة البيانات
sqlite3 ~/.kiro/cirvoy-mcp/database.sqlite "PRAGMA integrity_check;"

# 5. أعد تشغيل الخادم
# في Kiro: Ctrl+Shift+P > MCP: Restart Server > cirvoy-sync
```

---

### السيناريو 3: بطء شديد بعد فترة

**خطوات التشخيص:**

```bash
# 1. تحقق من حجم قاعدة البيانات
ls -lh ~/.kiro/cirvoy-mcp/database.sqlite

# 2. تحقق من استخدام الذاكرة
ps aux | grep cirvoy-kiro-mcp

# 3. تحقق من السجلات
wc -l ~/.kiro/cirvoy-mcp/logs/server.log

# 4. نظف البيانات القديمة
# (سيتم تنفيذه من واجهة الخادم)

# 5. أعد تشغيل الخادم
```

---

## الحصول على المساعدة

إذا لم تحل المشكلة:

### 1. جمع المعلومات

```bash
# معلومات النظام
uname -a
node --version
npm --version

# معلومات الخادم
cd cirvoy-kiro-mcp-integration
npm list --depth=0

# السجلات الأخيرة
tail -100 ~/.kiro/cirvoy-mcp/logs/server.log > ~/cirvoy-logs.txt
```

### 2. إنشاء تقرير

قم بإنشاء issue على GitHub مع:
- وصف المشكلة
- خطوات إعادة الإنتاج
- رسائل الخطأ (من السجلات)
- معلومات النظام
- ملف التكوين (احذف البيانات الحساسة!)

### 3. الموارد

- **GitHub Issues**: [رابط المشروع]
- **الوثائق**: [KIRO_SETUP.md](KIRO_SETUP.md)
- **الأمثلة**: [../examples/](../examples/)

---

## قائمة التحقق السريعة

عند مواجهة أي مشكلة، تحقق من:

- [ ] Node.js الإصدار 18 أو أحدث
- [ ] المشروع تم بناؤه (`npm run build`)
- [ ] ملف التكوين موجود وصحيح
- [ ] جميع الحقول المطلوبة موجودة
- [ ] `apiToken` صالح ولم تنته صلاحيته
- [ ] `webhookSecret` يطابق إعدادات Cirvoy
- [ ] `encryptionKey` 32 حرفًا على الأقل
- [ ] المنفذ `webhookPort` غير مستخدم
- [ ] الاتصال بالإنترنت يعمل
- [ ] جدار الحماية لا يحجب الاتصال
- [ ] مساحة القرص كافية
- [ ] الصلاحيات صحيحة على الملفات والمجلدات

---

**نصيحة أخيرة**: عند الشك، ابدأ بوضع التصحيح (`"level": "debug"`) وراقب السجلات!
