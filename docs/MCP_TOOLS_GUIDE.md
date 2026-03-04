# دليل استخدام أدوات MCP - Cirvoy-Kiro Integration

دليل شامل لاستخدام أدوات MCP المتاحة في خادم Cirvoy-Kiro.

---

## جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [أدوات المزامنة](#أدوات-المزامنة)
3. [أدوات إدارة المهام](#أدوات-إدارة-المهام)
4. [أدوات حل التعارضات](#أدوات-حل-التعارضات)
5. [أدوات المراقبة](#أدوات-المراقبة)
6. [أمثلة عملية](#أمثلة-عملية)

---

## نظرة عامة

بعد إعداد خادم MCP بنجاح، يمكنك استخدام الأدوات التالية من داخل Kiro IDE.

### طرق استدعاء الأدوات

#### الطريقة 1: من لوحة الأوامر

1. اضغط `Ctrl+Shift+P` (أو `Cmd+Shift+P` على Mac)
2. اكتب: `MCP: Execute Tool`
3. اختر `cirvoy-sync`
4. اختر الأداة المطلوبة
5. أدخل المعاملات

#### الطريقة 2: من الكود

```typescript
await mcp.callTool('cirvoy-sync', 'tool_name', {
  param1: 'value1',
  param2: 'value2'
});
```

---

## أدوات المزامنة

### 1. مزامنة المهام من Cirvoy

**الاسم**: `sync_tasks_from_cirvoy`

**الوصف**: يجلب المهام من Cirvoy ويحدثها في Kiro

**المعاملات**:

```typescript
{
  projectId: string;      // معرف المشروع في Cirvoy (مطلوب)
  since?: string;         // تاريخ آخر مزامنة (ISO 8601) (اختياري)
  includeCompleted?: boolean; // تضمين المهام المكتملة (افتراضي: false)
}
```

**مثال**:

```typescript
// مزامنة جميع المهام النشطة
const result = await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
  projectId: 'project-123'
});

console.log(`تم مزامنة ${result.syncedCount} مهمة`);

// مزامنة المهام المحدثة منذ تاريخ معين
const result2 = await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
  projectId: 'project-123',
  since: '2024-01-01T00:00:00Z',
  includeCompleted: true
});
```

**القيمة المرجعة**:

```typescript
{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: number;
  message: string;
}
```

---

### 2. مزامنة المهام إلى Cirvoy

**الاسم**: `sync_tasks_to_cirvoy`

**الوصف**: يرسل تحديثات المهام من Kiro إلى Cirvoy

**المعاملات**:

```typescript
{
  taskIds: string[];      // قائمة معرفات المهام (مطلوب)
  force?: boolean;        // فرض المزامنة حتى مع التعارضات (افتراضي: false)
}
```

**مثال**:

```typescript
// مزامنة مهام محددة
const result = await mcp.callTool('cirvoy-sync', 'sync_tasks_to_cirvoy', {
  taskIds: ['task-1', 'task-2', 'task-3']
});

// فرض المزامنة
const result2 = await mcp.callTool('cirvoy-sync', 'sync_tasks_to_cirvoy', {
  taskIds: ['task-4'],
  force: true
});
```

---

### 3. مزامنة ثنائية الاتجاه

**الاسم**: `bidirectional_sync`

**الوصف**: يزامن المهام في كلا الاتجاهين

**المعاملات**:

```typescript
{
  projectId: string;      // معرف المشروع (مطلوب)
  strategy?: 'latest' | 'cirvoy' | 'kiro'; // استراتيجية حل التعارضات (افتراضي: 'latest')
}
```

**مثال**:

```typescript
// مزامنة ثنائية مع تفضيل الأحدث
const result = await mcp.callTool('cirvoy-sync', 'bidirectional_sync', {
  projectId: 'project-123',
  strategy: 'latest'
});

// مزامنة مع تفضيل Cirvoy
const result2 = await mcp.callTool('cirvoy-sync', 'bidirectional_sync', {
  projectId: 'project-123',
  strategy: 'cirvoy'
});
```

---

## أدوات إدارة المهام

### 4. إنشاء مهمة

**الاسم**: `create_task`

**الوصف**: ينشئ مهمة جديدة في كل من Kiro و Cirvoy

**المعاملات**:

```typescript
{
  title: string;          // عنوان المهمة (مطلوب)
  description?: string;   // وصف المهمة (اختياري)
  projectId: string;      // معرف المشروع (مطلوب)
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // الأولوية (افتراضي: 'medium')
  dueDate?: string;       // تاريخ الاستحقاق ISO 8601 (اختياري)
  assignee?: string;      // المكلف بالمهمة (اختياري)
  tags?: string[];        // الوسوم (اختياري)
}
```

**مثال**:

```typescript
const task = await mcp.callTool('cirvoy-sync', 'create_task', {
  title: 'تنفيذ ميزة المصادقة',
  description: 'إضافة نظام مصادقة المستخدمين باستخدام JWT',
  projectId: 'project-123',
  priority: 'high',
  dueDate: '2024-12-31T23:59:59Z',
  assignee: 'user-456',
  tags: ['authentication', 'security', 'backend']
});

console.log(`تم إنشاء المهمة: ${task.id}`);
```

---

### 5. تحديث مهمة

**الاسم**: `update_task`

**الوصف**: يحدث مهمة موجودة

**المعاملات**:

```typescript
{
  taskId: string;         // معرف المهمة (مطلوب)
  updates: {              // التحديثات (مطلوب)
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done' | 'blocked';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    assignee?: string;
    tags?: string[];
  };
  syncToCirvoy?: boolean; // مزامنة فورية إلى Cirvoy (افتراضي: true)
}
```

**مثال**:

```typescript
await mcp.callTool('cirvoy-sync', 'update_task', {
  taskId: 'task-123',
  updates: {
    status: 'in_progress',
    priority: 'urgent'
  }
});
```

---

### 6. حذف مهمة

**الاسم**: `delete_task`

**الوصف**: يحذف مهمة من كل من Kiro و Cirvoy

**المعاملات**:

```typescript
{
  taskId: string;         // معرف المهمة (مطلوب)
  permanent?: boolean;    // حذف نهائي أم نقل إلى المحذوفات (افتراضي: false)
}
```

**مثال**:

```typescript
// نقل إلى المحذوفات
await mcp.callTool('cirvoy-sync', 'delete_task', {
  taskId: 'task-123'
});

// حذف نهائي
await mcp.callTool('cirvoy-sync', 'delete_task', {
  taskId: 'task-456',
  permanent: true
});
```

---

## أدوات حل التعارضات

### 7. عرض التعارضات

**الاسم**: `list_conflicts`

**الوصف**: يعرض قائمة بجميع التعارضات الحالية

**المعاملات**: لا يوجد

**مثال**:

```typescript
const conflicts = await mcp.callTool('cirvoy-sync', 'list_conflicts', {});

console.log(`عدد التعارضات: ${conflicts.length}`);
conflicts.forEach(conflict => {
  console.log(`- ${conflict.taskId}: ${conflict.reason}`);
});
```

**القيمة المرجعة**:

```typescript
{
  id: string;
  taskId: string;
  reason: string;
  kiroVersion: object;
  cirvoyVersion: object;
  timestamp: string;
}[]
```

---

### 8. حل تعارض

**الاسم**: `resolve_conflict`

**الوصف**: يحل تعارضًا محددًا

**المعاملات**:

```typescript
{
  conflictId: string;     // معرف التعارض (مطلوب)
  resolution: 'use_kiro' | 'use_cirvoy' | 'merge'; // طريقة الحل (مطلوب)
  mergeStrategy?: object; // استراتيجية الدمج (مطلوب إذا كان resolution = 'merge')
}
```

**مثال**:

```typescript
// استخدام نسخة Kiro
await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
  conflictId: 'conflict-123',
  resolution: 'use_kiro'
});

// استخدام نسخة Cirvoy
await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
  conflictId: 'conflict-456',
  resolution: 'use_cirvoy'
});

// دمج يدوي
await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
  conflictId: 'conflict-789',
  resolution: 'merge',
  mergeStrategy: {
    title: 'from_kiro',
    description: 'from_cirvoy',
    status: 'from_kiro',
    priority: 'from_cirvoy'
  }
});
```

---

## أدوات المراقبة

### 9. حالة المزامنة

**الاسم**: `get_sync_status`

**الوصف**: يعرض حالة المزامنة الحالية

**المعاملات**: لا يوجد

**مثال**:

```typescript
const status = await mcp.callTool('cirvoy-sync', 'get_sync_status', {});

console.log(`آخر مزامنة: ${status.lastSync}`);
console.log(`المهام المتزامنة: ${status.totalTasks}`);
console.log(`التعارضات: ${status.conflicts}`);
console.log(`الحالة: ${status.isRunning ? 'يعمل' : 'متوقف'}`);
```

**القيمة المرجعة**:

```typescript
{
  isRunning: boolean;
  lastSync: string;
  nextSync: string;
  totalTasks: number;
  pendingSync: number;
  conflicts: number;
  errors: number;
}
```

---

### 10. إحصائيات المزامنة

**الاسم**: `get_sync_stats`

**الوصف**: يعرض إحصائيات تفصيلية عن المزامنة

**المعاملات**:

```typescript
{
  period?: 'hour' | 'day' | 'week' | 'month'; // الفترة الزمنية (افتراضي: 'day')
}
```

**مثال**:

```typescript
const stats = await mcp.callTool('cirvoy-sync', 'get_sync_stats', {
  period: 'week'
});

console.log(`عمليات المزامنة: ${stats.syncCount}`);
console.log(`المهام المحدثة: ${stats.updatedTasks}`);
console.log(`الأخطاء: ${stats.errors}`);
console.log(`متوسط وقت المزامنة: ${stats.avgSyncTime}ms`);
```

---

### 11. السجلات

**الاسم**: `get_logs`

**الوصف**: يجلب سجلات الخادم

**المعاملات**:

```typescript
{
  level?: 'debug' | 'info' | 'warning' | 'error'; // مستوى السجل (اختياري)
  limit?: number;         // عدد السجلات (افتراضي: 100)
  since?: string;         // منذ تاريخ معين (اختياري)
}
```

**مثال**:

```typescript
// آخر 50 سجل
const logs = await mcp.callTool('cirvoy-sync', 'get_logs', {
  limit: 50
});

// الأخطاء فقط
const errors = await mcp.callTool('cirvoy-sync', 'get_logs', {
  level: 'error',
  limit: 20
});
```

---

## أمثلة عملية

### مثال 1: سير عمل المزامنة اليومية

```typescript
async function dailySync() {
  // 1. التحقق من الحالة
  const status = await mcp.callTool('cirvoy-sync', 'get_sync_status', {});
  
  if (!status.isRunning) {
    console.log('الخادم متوقف!');
    return;
  }
  
  // 2. مزامنة ثنائية
  const syncResult = await mcp.callTool('cirvoy-sync', 'bidirectional_sync', {
    projectId: 'my-project',
    strategy: 'latest'
  });
  
  console.log(`تم مزامنة ${syncResult.syncedCount} مهمة`);
  
  // 3. التحقق من التعارضات
  if (syncResult.conflicts > 0) {
    const conflicts = await mcp.callTool('cirvoy-sync', 'list_conflicts', {});
    console.log('تعارضات تحتاج إلى حل:', conflicts);
  }
}
```

---

### مثال 2: إنشاء ومتابعة مهمة

```typescript
async function createAndTrackTask() {
  // 1. إنشاء المهمة
  const task = await mcp.callTool('cirvoy-sync', 'create_task', {
    title: 'تطوير واجهة المستخدم',
    description: 'تصميم وتطوير واجهة المستخدم الرئيسية',
    projectId: 'project-123',
    priority: 'high',
    dueDate: '2024-12-31T23:59:59Z',
    tags: ['frontend', 'ui', 'design']
  });
  
  console.log(`تم إنشاء المهمة: ${task.id}`);
  
  // 2. بدء العمل
  await mcp.callTool('cirvoy-sync', 'update_task', {
    taskId: task.id,
    updates: {
      status: 'in_progress'
    }
  });
  
  // ... العمل على المهمة ...
  
  // 3. إكمال المهمة
  await mcp.callTool('cirvoy-sync', 'update_task', {
    taskId: task.id,
    updates: {
      status: 'done'
    }
  });
  
  console.log('تم إكمال المهمة!');
}
```

---

### مثال 3: حل التعارضات تلقائيًا

```typescript
async function autoResolveConflicts() {
  // 1. الحصول على التعارضات
  const conflicts = await mcp.callTool('cirvoy-sync', 'list_conflicts', {});
  
  if (conflicts.length === 0) {
    console.log('لا توجد تعارضات');
    return;
  }
  
  // 2. حل كل تعارض
  for (const conflict of conflicts) {
    // استراتيجية: استخدام الأحدث
    const kiroTime = new Date(conflict.kiroVersion.updatedAt);
    const cirvoyTime = new Date(conflict.cirvoyVersion.updatedAt);
    
    const resolution = kiroTime > cirvoyTime ? 'use_kiro' : 'use_cirvoy';
    
    await mcp.callTool('cirvoy-sync', 'resolve_conflict', {
      conflictId: conflict.id,
      resolution: resolution
    });
    
    console.log(`تم حل التعارض ${conflict.id} باستخدام ${resolution}`);
  }
}
```

---

### مثال 4: مراقبة الأداء

```typescript
async function monitorPerformance() {
  // 1. الحصول على الإحصائيات
  const stats = await mcp.callTool('cirvoy-sync', 'get_sync_stats', {
    period: 'day'
  });
  
  console.log('=== إحصائيات اليوم ===');
  console.log(`عمليات المزامنة: ${stats.syncCount}`);
  console.log(`المهام المحدثة: ${stats.updatedTasks}`);
  console.log(`الأخطاء: ${stats.errors}`);
  console.log(`متوسط الوقت: ${stats.avgSyncTime}ms`);
  
  // 2. التحقق من الأخطاء
  if (stats.errors > 0) {
    const errorLogs = await mcp.callTool('cirvoy-sync', 'get_logs', {
      level: 'error',
      limit: 10
    });
    
    console.log('\n=== آخر الأخطاء ===');
    errorLogs.forEach(log => {
      console.log(`[${log.timestamp}] ${log.message}`);
    });
  }
}
```

---

## نصائح وأفضل الممارسات

### 1. المزامنة

- استخدم `bidirectional_sync` للمزامنة الدورية
- استخدم `sync_tasks_from_cirvoy` عند بدء العمل
- استخدم `sync_tasks_to_cirvoy` قبل إنهاء العمل

### 2. حل التعارضات

- راجع التعارضات يوميًا
- استخدم `strategy: 'latest'` للحالات العامة
- استخدم `strategy: 'cirvoy'` إذا كان Cirvoy هو المصدر الرئيسي
- استخدم `resolution: 'merge'` للتعارضات المعقدة

### 3. الأداء

- لا تزامن مهام كثيرة جدًا دفعة واحدة
- استخدم `since` لتقليل البيانات المنقولة
- راقب الإحصائيات بانتظام

### 4. معالجة الأخطاء

```typescript
try {
  const result = await mcp.callTool('cirvoy-sync', 'sync_tasks_from_cirvoy', {
    projectId: 'project-123'
  });
  
  if (!result.success) {
    console.error('فشلت المزامنة:', result.message);
  }
} catch (error) {
  console.error('خطأ في المزامنة:', error);
}
```

---

## الموارد الإضافية

- **دليل الإعداد**: [KIRO_SETUP.md](KIRO_SETUP.md)
- **دليل التكوين**: [CONFIG_GUIDE.md](CONFIG_GUIDE.md)
- **استكشاف الأخطاء**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **أمثلة الكود**: [../examples/](../examples/)

---

**ملاحظة**: هذه الأدوات قيد التطوير وقد تتغير في الإصدارات المستقبلية.
