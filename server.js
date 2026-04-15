const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// مسیر پوشه ذخیره‌سازی - هر شخص یک فایل جداگانه
const DATA_DIR = path.join(__dirname, 'data', 'persons');

// ساخت پوشه‌ها اگر وجود ندارند
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 پوشه data/persons ساخته شد');
}

// تنظیمات حجم بالا برای عکس و اسناد Base64
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// سرو کردن فایل‌های استاتیک از پوشه public
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// GET /api/persons - دریافت تمام اشخاص
// =============================================
app.get('/api/persons', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const persons = [];

    files.forEach(file => {
      try {
        const filePath = path.join(DATA_DIR, file);
        const raw = fs.readFileSync(filePath, 'utf8');
        const person = JSON.parse(raw);
        persons.push(person);
      } catch (err) {
        console.error(`⚠️  خطا در خواندن فایل ${file}:`, err.message);
      }
    });

    // مرتب‌سازی بر اساس آخرین بروزرسانی (جدیدترین اول)
    persons.sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA;
    });

    console.log(`📋 ${persons.length} پرونده بارگذاری شد`);
    res.json(persons);

  } catch (err) {
    console.error('❌ خطا در خواندن پوشه:', err);
    res.status(500).json({ error: 'خطا در خواندن اطلاعات' });
  }
});

// =============================================
// POST /api/persons - ذخیره یا بروزرسانی یک شخص
// =============================================
app.post('/api/persons', (req, res) => {
  try {
    const person = req.body;

    if (!person || !person.id) {
      return res.status(400).json({ success: false, message: 'داده‌های ارسالی ناقص است' });
    }

    if (!person.personal || !person.personal.name) {
      return res.status(400).json({ success: false, message: 'نام شخص الزامی است' });
    }

    const filePath = path.join(DATA_DIR, `${person.id}.json`);
    const isNew = !fs.existsSync(filePath);

    // اگر ایجاد جدید است و createdAt ندارد، اضافه کن
    if (isNew && !person.createdAt) {
      person.createdAt = new Date().toLocaleString('fa-IR');
    }

    // همیشه lastUpdated را بروز کن
    person.lastUpdated = new Date().toLocaleString('fa-IR');

    fs.writeFileSync(filePath, JSON.stringify(person, null, 2), 'utf8');

    const stats = fs.statSync(filePath);
    const size = stats.size;
    const sizeStr = size > 1048576
      ? (size / 1048576).toFixed(2) + ' MB'
      : (size / 1024).toFixed(1) + ' KB';

    console.log(`${isNew ? '✅ ایجاد' : '📝 بروزرسانی'}: ${person.personal.name} | ID: ${person.id} | حجم: ${sizeStr}`);

    res.json({ success: true, isNew, id: person.id, fileSize: sizeStr });

  } catch (err) {
    console.error('❌ خطا در ذخیره:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================
// DELETE /api/persons/:id - حذف یک شخص
// =============================================
app.delete('/api/persons/:id', (req, res) => {
  try {
    const id = req.params.id;
    const filePath = path.join(DATA_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  فایل یافت نشد: ${id}.json`);
      return res.json({ success: false, message: 'پرونده یافت نشد' });
    }

    // خواندن نام قبل از حذف برای لاگ
    let personName = 'نامشخص';
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      personName = data.personal ? data.personal.name : 'نامشخص';
    } catch (e) {}

    fs.unlinkSync(filePath);
    console.log(`🗑️  حذف شد: ${personName} | ID: ${id}`);
    res.json({ success: true });

  } catch (err) {
    console.error('❌ خطا در حذف:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================
// POST /api/wipe - پاک‌سازی کامل دیتابیس
// =============================================
app.post('/api/wipe', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    let deletedCount = 0;

    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(DATA_DIR, file));
        deletedCount++;
      } catch (err) {
        console.error(`⚠️  خطا در حذف فایل ${file}:`, err.message);
      }
    });

    console.log(`🧹 فرمت کامل: ${deletedCount} فایل حذف شد`);
    res.json({ success: true, deletedCount });

  } catch (err) {
    console.error('❌ خطا در فرمت:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================
// GET /api/stats - آمار سرور
// =============================================
app.get('/api/stats', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    let totalSize = 0;

    files.forEach(f => {
      try {
        totalSize += fs.statSync(path.join(DATA_DIR, f)).size;
      } catch (e) {}
    });

    const sizeStr = totalSize > 1048576
      ? (totalSize / 1048576).toFixed(2) + ' MB'
      : (totalSize / 1024).toFixed(1) + ' KB';

    res.json({
      totalPersons: files.length,
      totalSize,
      totalSizeStr: sizeStr
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// مدیریت خطاهای عمومی
// =============================================
app.use((err, req, res, next) => {
  console.error('❌ خطای سرور:', err);
  res.status(500).json({ error: 'خطای داخلی سرور' });
});

// =============================================
// شروع سرور
// =============================================
app.listen(PORT, () => {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      🟢 سرور مدیریت اشخاص فعال شد               ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  📡 آدرس:    http://localhost:${PORT}                ║`);
  console.log(`║  📁 ساختار:  یک فایل JSON برای هر شخص           ║`);
  console.log(`║  📋 پرونده‌ها: ${String(files.length).padEnd(3)} پرونده موجود               ║`);
  console.log(`║  📂 مسیر:    ./data/persons/                      ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  برای توقف سرور، پنجره را ببندید یا Ctrl+C بزنید');
  console.log('');
});