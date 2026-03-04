# دليل التكوين الشامل - Cirvoy-Kiro MCP Server

دليل تفصيلي لجميع خيارات التكوين المتاحة في خادم MCP.

---

## جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [إعدادات Cirvoy](#إعدادات-cirvoy)
3. [إعدادات الخادم](#إعدادات-الخادم)
4. [إعدادات التخزين](#إعدادات-التخزين)
5. [إعدادات السجلات](#إعدادات-السجلات)
6. [إعدادات الأداء](#إعدادات-الأداء)
7. [متغيرات البيئة](#متغيرات-البيئة)
8. [أمثلة التكوين](#أمثلة-التكوين)

---

## نظرة عامة

يقرأ الخادم التكوين من ملف JSON موجود في `~/.kiro/cirvoy-mcp/config.json` بشكل افتراضي.

### هيكل ملف التكوين

```json
{
  "cirvoy": { ... },
  "server": { ... },
  "storage": { ... },
  "logging": { ... },
  "performance": { ... }
}
```

---

## إعدادات Cirvoy

تكوين الاتصال بـ API الخاص بـ Cirvoy.

### `cirvoy.baseURL`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **الوصف**: عنوان URL الأساسي لـ API الخاص بـ Cirvoy
- **التنسيق**: يجب أن يكون URL صالح يبدأ بـ `https://`
- **مثال**: `"https://cirvoy.example.com/api"`

```json
{
  "cirvoy": {
    "baseURL": "https://your-company.cirvoy.com/api"
  }
}
```

### `cirvoy.apiToken`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **الوصف**: رمز المصادقة للوصول إلى API
- **الحصول عليه**: من إعدادات حسابك في Cirvoy > API Tokens
- **الأمان**: يمكن تشفيره باستخدام `encryptionKey`
- **مثال**: `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`

```json
{
  "cirvoy": {
    "apiToken": "your-actual-api-token-here"
  }
}
```

**نصيحة**: استخدم التشفير للأمان:
```bash
node examples/encrypt-credentials-example.ts
```

### `cirvoy.webhookSecret`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **الوصف**: المفتاح السري للتحقق من توقيعات HMAC للـ Webhooks
- **الحصول عليه**: من إعدادات Cirvoy > Webhooks > Secret Key
- **الأمان**: يمكن تشفيره
- **مثال**: `"my-super-secret-webhook-key-2024"`

```json
{
  "cirvoy": {
    "webhookSecret": "your-webhook-secret-from-cirvoy"
  }
}
```

### `cirvoy.timeout`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: مهلة طلبات HTTP بالميلي ثانية
- **النطاق**: `1000` - `60000` (1 ثانية - 60 ثانية)
- **القيمة الافتراضية**: `30000` (30 ثانية)
- **مثال**: `30000`

```json
{
  "cirvoy": {
    "timeout": 30000
  }
}
```

**متى تغير هذه القيمة:**
- زد القيمة إذا كانت الطلبات تفشل بسبب بطء الشبكة
- قلل القيمة لاكتشاف المشاكل بشكل أسرع

---

## إعدادات الخادم

تكوين سلوك خادم MCP.

### `server.webhookPort`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: المنفذ الذي يستمع عليه خادم Webhook
- **النطاق**: `1024` - `65535`
- **القيمة الافتراضية**: `3000`
- **مثال**: `3000`

```json
{
  "server": {
    "webhookPort": 3000
  }
}
```

**ملاحظات:**
- تأكد من أن المنفذ غير مستخدم من تطبيق آخر
- قد تحتاج إلى فتح المنفذ في جدار الحماية
- استخدم منفذ أعلى من 1024 لتجنب الحاجة إلى صلاحيات root

### `server.syncInterval`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: الفاصل الزمني بين عمليات المزامنة بالثواني
- **النطاق**: `1` - `3600` (1 ثانية - 1 ساعة)
- **القيمة الافتراضية**: `5` ثواني
- **مثال**: `5`

```json
{
  "server": {
    "syncInterval": 5
  }
}
```

**التوصيات:**
- `1-5` ثواني: للمزامنة شبه الفورية (استهلاك أعلى للموارد)
- `10-30` ثانية: متوازن للاستخدام العادي
- `60+` ثانية: للمشاريع الكبيرة أو الشبكات البطيئة

### `server.maxRetries`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: الحد الأقصى لعدد محاولات إعادة المحاولة عند فشل العملية
- **النطاق**: `0` - `10`
- **القيمة الافتراضية**: `3`
- **مثال**: `3`

```json
{
  "server": {
    "maxRetries": 3
  }
}
```

**متى تغير هذه القيمة:**
- زد القيمة إذا كانت الشبكة غير مستقرة
- قلل القيمة لفشل أسرع في حالة المشاكل الدائمة

### `server.retryBackoffMs`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: التأخير الأساسي بالميلي ثانية لاستراتيجية الانتظار الأسي
- **النطاق**: `100` - `10000`
- **القيمة الافتراضية**: `1000` (1 ثانية)
- **مثال**: `1000`

```json
{
  "server": {
    "retryBackoffMs": 1000
  }
}
```

**كيف يعمل:**
- المحاولة 1: انتظر `retryBackoffMs` × 1
- المحاولة 2: انتظر `retryBackoffMs` × 2
- المحاولة 3: انتظر `retryBackoffMs` × 4
- وهكذا...

---

## إعدادات التخزين

تكوين قاعدة البيانات والتشفير.

### `storage.dbPath`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **الوصف**: مسار ملف قاعدة بيانات SQLite
- **يدعم**: توسيع `~` لمجلد المستخدم الرئيسي
- **القيمة الافتراضية**: `"~/.kiro/cirvoy-mcp/database.sqlite"`
- **مثال**: `"~/.kiro/cirvoy-mcp/database.sqlite"`

```json
{
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite"
  }
}
```

**أمثلة أخرى:**
```json
// مسار مطلق
"dbPath": "/var/lib/cirvoy-mcp/db.sqlite"

// مسار نسبي (من مجلد المشروع)
"dbPath": "./data/database.sqlite"

// في مجلد مخصص
"dbPath": "~/Documents/cirvoy-data/db.sqlite"
```

### `storage.encryptionKey`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **الوصف**: مفتاح التشفير AES-256-GCM لتأمين البيانات الحساسة
- **الحد الأدنى للطول**: 32 حرفًا
- **التوصية**: استخدم 32-64 حرفًا عشوائيًا
- **مثال**: `"my-super-secret-32-char-key-12345"`

```json
{
  "storage": {
    "encryptionKey": "your-32-character-encryption-key-here-minimum-length"
  }
}
```

**إنشاء مفتاح آمن:**

```bash
# طريقة 1: باستخدام OpenSSL
openssl rand -base64 32

# طريقة 2: باستخدام Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# طريقة 3: باستخدام pwgen (إذا كان مثبتًا)
pwgen -s 32 1
```

**⚠️ تحذير أمني:**
- لا تشارك هذا المفتاح أبدًا
- لا تضعه في نظام التحكم بالإصدارات (Git)
- استخدم متغيرات البيئة في الإنتاج
- قم بتغييره بانتظام

---

## إعدادات السجلات

تكوين نظام السجلات.

### `logging.level`

- **النوع**: `string`
- **مطلوب**: نعم ✅
- **القيم المسموحة**: `"debug"`, `"info"`, `"warning"`, `"error"`
- **القيمة الافتراضية**: `"info"`
- **مثال**: `"info"`

```json
{
  "logging": {
    "level": "info"
  }
}
```

**شرح المستويات:**

| المستوى | الوصف | متى تستخدمه |
|---------|-------|-------------|
| `debug` | جميع الرسائل التفصيلية | التطوير واستكشاف الأخطاء |
| `info` | معلومات عامة عن العمليات | الاستخدام العادي (موصى به) |
| `warning` | تحذيرات لا توقف العمل | الإنتاج مع مراقبة خفيفة |
| `error` | أخطاء فقط | الإنتاج مع الحد الأدنى من السجلات |

### `logging.filePath`

- **النوع**: `string`
- **مطلوب**: لا (اختياري)
- **الوصف**: مسار ملف السجلات
- **يدعم**: توسيع `~`
- **القيمة الافتراضية**: `undefined` (السجلات في قاعدة البيانات فقط)
- **مثال**: `"~/.kiro/cirvoy-mcp/logs/server.log"`

```json
{
  "logging": {
    "filePath": "~/.kiro/cirvoy-mcp/logs/server.log"
  }
}
```

**ملاحظات:**
- إذا لم يتم تحديده، يتم حفظ السجلات في قاعدة البيانات فقط
- المجلد الأب يجب أن يكون موجودًا
- يتم إنشاء الملف تلقائيًا إذا لم يكن موجودًا

---

## إعدادات الأداء

تكوين استخدام الموارد والأداء.

### `performance.maxMemoryMB`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: الحد الأقصى لاستخدام الذاكرة بالميجابايت
- **النطاق**: `50` - `1024` MB
- **القيمة الافتراضية**: `100` MB
- **مثال**: `100`

```json
{
  "performance": {
    "maxMemoryMB": 100
  }
}
```

**التوصيات:**
- `50-100` MB: للأجهزة محدودة الموارد
- `100-256` MB: للاستخدام العادي (موصى به)
- `256-512` MB: للمشاريع الكبيرة
- `512+` MB: للمشاريع الضخمة مع مزامنة مكثفة

### `performance.batchSize`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: عدد المهام التي تتم معالجتها في دفعة واحدة
- **النطاق**: `1` - `1000`
- **القيمة الافتراضية**: `10`
- **مثال**: `10`

```json
{
  "performance": {
    "batchSize": 10
  }
}
```

**التوصيات:**
- `1-10`: للمشاريع الصغيرة أو الأجهزة الضعيفة
- `10-50`: للاستخدام العادي (موصى به)
- `50-100`: للمشاريع الكبيرة مع موارد جيدة
- `100+`: للمزامنة الضخمة (يتطلب ذاكرة كافية)

### `performance.maxConcurrentSyncs`

- **النوع**: `number`
- **مطلوب**: نعم ✅
- **الوصف**: الحد الأقصى لعدد عمليات المزامنة المتزامنة
- **النطاق**: `1` - `100`
- **القيمة الافتراضية**: `5`
- **مثال**: `5`

```json
{
  "performance": {
    "maxConcurrentSyncs": 5
  }
}
```

**التوصيات:**
- `1-3`: للشبكات البطيئة أو الأجهزة الضعيفة
- `5-10`: للاستخدام العادي (موصى به)
- `10-20`: للشبكات السريعة والأجهزة القوية
- `20+`: للبنية التحتية للخوادم فقط

---

## متغيرات البيئة

يمكن تجاوز جميع إعدادات التكوين باستخدام متغيرات البيئة.

### جدول متغيرات البيئة

| حقل التكوين | متغير البيئة | مثال |
|-------------|---------------|-------|
| `cirvoy.baseURL` | `CIRVOY_BASE_URL` | `https://cirvoy.example.com/api` |
| `cirvoy.apiToken` | `CIRVOY_API_TOKEN` | `your-token` |
| `cirvoy.webhookSecret` | `CIRVOY_WEBHOOK_SECRET` | `your-secret` |
| `cirvoy.timeout` | `CIRVOY_TIMEOUT` | `30000` |
| `server.webhookPort` | `SERVER_WEBHOOK_PORT` | `3000` |
| `server.syncInterval` | `SERVER_SYNC_INTERVAL` | `5` |
| `server.maxRetries` | `SERVER_MAX_RETRIES` | `3` |
| `server.retryBackoffMs` | `SERVER_RETRY_BACKOFF_MS` | `1000` |
| `storage.dbPath` | `STORAGE_DB_PATH` | `~/.kiro/cirvoy-mcp/db.sqlite` |
| `storage.encryptionKey` | `STORAGE_ENCRYPTION_KEY` | `your-key` |
| `logging.level` | `LOGGING_LEVEL` | `info` |
| `logging.filePath` | `LOGGING_FILE_PATH` | `~/logs/server.log` |
| `performance.maxMemoryMB` | `PERFORMANCE_MAX_MEMORY_MB` | `100` |
| `performance.batchSize` | `PERFORMANCE_BATCH_SIZE` | `10` |
| `performance.maxConcurrentSyncs` | `PERFORMANCE_MAX_CONCURRENT_SYNCS` | `5` |

### استخدام متغيرات البيئة

#### في سطر الأوامر

```bash
export CIRVOY_API_TOKEN="your-token"
export STORAGE_ENCRYPTION_KEY="your-key"
npm start
```

#### في ملف `.env`

```bash
# .env
CIRVOY_BASE_URL=https://cirvoy.example.com/api
CIRVOY_API_TOKEN=your-token
CIRVOY_WEBHOOK_SECRET=your-secret
STORAGE_ENCRYPTION_KEY=your-key
LOGGING_LEVEL=debug
```

ثم:
```bash
source .env
npm start
```

#### في تكوين Kiro

```json
{
  "mcpServers": {
    "cirvoy-sync": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CIRVOY_API_TOKEN": "your-token",
        "STORAGE_ENCRYPTION_KEY": "your-key",
        "LOGGING_LEVEL": "debug"
      }
    }
  }
}
```

---

## أمثلة التكوين

### مثال 1: التكوين الأساسي (للبدء)

```json
{
  "cirvoy": {
    "baseURL": "https://cirvoy.example.com/api",
    "apiToken": "your-api-token",
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
    "encryptionKey": "your-32-character-encryption-key"
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

### مثال 2: تكوين عالي الأداء

للمشاريع الكبيرة مع موارد وفيرة:

```json
{
  "cirvoy": {
    "baseURL": "https://cirvoy.example.com/api",
    "apiToken": "your-api-token",
    "webhookSecret": "your-webhook-secret",
    "timeout": 45000
  },
  "server": {
    "webhookPort": 3000,
    "syncInterval": 3,
    "maxRetries": 5,
    "retryBackoffMs": 500
  },
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite",
    "encryptionKey": "your-32-character-encryption-key"
  },
  "logging": {
    "level": "info",
    "filePath": "~/.kiro/cirvoy-mcp/logs/server.log"
  },
  "performance": {
    "maxMemoryMB": 512,
    "batchSize": 50,
    "maxConcurrentSyncs": 20
  }
}
```

### مثال 3: تكوين موفر للموارد

للأجهزة محدودة الموارد أو الشبكات البطيئة:

```json
{
  "cirvoy": {
    "baseURL": "https://cirvoy.example.com/api",
    "apiToken": "your-api-token",
    "webhookSecret": "your-webhook-secret",
    "timeout": 60000
  },
  "server": {
    "webhookPort": 3000,
    "syncInterval": 30,
    "maxRetries": 2,
    "retryBackoffMs": 2000
  },
  "storage": {
    "dbPath": "~/.kiro/cirvoy-mcp/database.sqlite",
    "encryptionKey": "your-32-character-encryption-key"
  },
  "logging": {
    "level": "warning"
  },
  "performance": {
    "maxMemoryMB": 50,
    "batchSize": 5,
    "maxConcurrentSyncs": 2
  }
}
```

### مثال 4: تكوين التطوير

للتطوير واستكشاف الأخطاء:

```json
{
  "cirvoy": {
    "baseURL": "http://localhost:8080/api",
    "apiToken": "dev-token",
    "webhookSecret": "dev-secret",
    "timeout": 10000
  },
  "server": {
    "webhookPort": 3001,
    "syncInterval": 10,
    "maxRetries": 1,
    "retryBackoffMs": 500
  },
  "storage": {
    "dbPath": "./dev-database.sqlite",
    "encryptionKey": "dev-key-32-characters-minimum"
  },
  "logging": {
    "level": "debug",
    "filePath": "./logs/dev-server.log"
  },
  "performance": {
    "maxMemoryMB": 100,
    "batchSize": 5,
    "maxConcurrentSyncs": 3
  }
}
```

---

## التحقق من صحة التكوين

يقوم الخادم بالتحقق من صحة التكوين عند بدء التشغيل:

### رسائل الخطأ الشائعة

#### 1. حقول مطلوبة مفقودة

```
Error: Missing required configuration fields: cirvoy.apiToken, storage.encryptionKey
```

**الحل**: أضف الحقول المفقودة إلى ملف التكوين.

#### 2. قيمة خارج النطاق

```
Error: cirvoy.timeout must be between 1000 and 60000
```

**الحل**: اضبط القيمة ضمن النطاق المسموح.

#### 3. مفتاح تشفير قصير

```
Error: storage.encryptionKey must be at least 32 characters
```

**الحل**: استخدم مفتاح أطول (32 حرفًا على الأقل).

#### 4. مستوى سجلات غير صالح

```
Error: logging.level must be one of: debug, info, warning, error
```

**الحل**: استخدم أحد المستويات المسموحة.

---

## نصائح وأفضل الممارسات

### 1. الأمان

✅ **افعل:**
- استخدم مفاتيح تشفير قوية (32+ حرفًا عشوائيًا)
- قم بتخزين البيانات الحساسة في متغيرات البيئة
- قيد صلاحيات ملف التكوين: `chmod 600 config.json`
- قم بتشفير `apiToken` و `webhookSecret`

❌ **لا تفعل:**
- لا تضع ملف التكوين في Git
- لا تشارك مفتاح التشفير
- لا تستخدم مفاتيح ضعيفة أو قصيرة

### 2. الأداء

✅ **افعل:**
- ابدأ بالإعدادات الافتراضية
- زد الموارد تدريجيًا حسب الحاجة
- راقب استخدام الذاكرة والمعالج
- اضبط `batchSize` حسب حجم المشروع

❌ **لا تفعل:**
- لا تستخدم قيم عالية جدًا دون حاجة
- لا تقلل `syncInterval` إلى أقل من 1 ثانية
- لا تزد `maxConcurrentSyncs` بشكل مفرط

### 3. السجلات

✅ **افعل:**
- استخدم `info` للإنتاج
- استخدم `debug` للتطوير فقط
- راقب حجم ملف السجلات
- قم بأرشفة السجلات القديمة

❌ **لا تفعل:**
- لا تستخدم `debug` في الإنتاج (أداء أبطأ)
- لا تترك السجلات تملأ القرص

---

## الموارد الإضافية

- **دليل الإعداد**: [KIRO_SETUP.md](KIRO_SETUP.md)
- **دليل البدء السريع**: [QUICK_START.md](QUICK_START.md)
- **README**: [../README.md](../README.md)
- **أمثلة**: [../examples/](../examples/)

---

**آخر تحديث**: 2024
