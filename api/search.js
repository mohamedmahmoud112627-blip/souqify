module.exports = async (req, res) => {
  // 1. السماح لأي جهاز بالاتصال (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  // لو جالك طلب تجريبي (OPTIONS) خلصه على طول
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة غير مسموحة، استخدم POST' });
  }

  try {
    const { keyword } = req.body;
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ error: 'من فضلك اكتب اسم المنتج' });
    }

    // جلب المفتاح السري من بيئة Vercel
    const RAPID_KEY = process.env.RAPID_KEY;
    if (!RAPID_KEY) {
      return res.status(500).json({ error: 'مفتاح RapidAPI مش موجود في إعدادات Vercel (Environment Variables)' });
    }

    // طلب البحث من علي إكسبريس
    const response = await fetch(
      `https://ali-express-api1.p.rapidapi.com/search?query=${encodeURIComponent(keyword)}&page=1`,
      {
        headers: {
          'X-RapidAPI-Key': RAPID_KEY,
          'X-RapidAPI-Host': 'ali-express-api1.p.rapidapi.com'
        }
      }
    );

    // لو الـ API رجع بحالة مش 200
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `الـ API رجع خطأ (${response.status})`, 
        details: errorText 
      });
    }

    const data = await response.json();

    // ===== هنا الجزء المهم: المرونة في قراءة البيانات (عشان لو شكلها اختلف) =====
    let productsArray = [];
    
    // في الغالب البيانات بتكون جوا result، لكن بنفحص كل الاحتمالات
    if (data?.data?.result) {
      productsArray = data.data.result;
    } else if (data?.result) {
      productsArray = data.result;
    } else if (Array.isArray(data)) {
      productsArray = data;
    } else if (data?.products) {
      productsArray = data.products;
    } else {
      // لو مش لاقي المنتجات، نرجع تفاصيل الرد عشان تعرف إنت شكل البيانات إيه
      return res.status(200).json({ 
        error: 'الـ API رجع بيانات لكن مش بالشكل المتوقع',
        fullResponse: data // هيعرضلك أول 100 حرف من الرد عشان تشوف بنفسك
      });
    }

    // لو مفيش منتجات خالص
    if (!productsArray || productsArray.length === 0) {
      return res.status(200).json([]); // رجع مصفوفة فاضية
    }

    // تهيئة المنتجات بالشكل النهائي (مع رابط العمولة)
    // استبدل "YOUR_AFFILIATE_ID" بكود التتبع بتاعك من علي إكسبريس
    const products = productsArray.map(item => ({
      id: item.productId || item.id || Math.random().toString(36),
      title: item.title || item.productTitle || 'منتج بدون اسم',
      price: item.price ? `${item.price} دولار` : 'السعر غير متاح',
      image: item.imageUrl || item.image || item.productImage || 'https://via.placeholder.com/300x300?text=No+Image',
      link: `https://s.click.aliexpress.com/e/_YOUR_AFFILIATE_ID?productId=${item.productId || item.id || ''}`
    }));

    res.status(200).json(products);

  } catch (error) {
    // أي خطأ طارئ في الكود نفسه
    res.status(500).json({ 
      error: 'حصل عطل في سيرفر البحث',
      details: error.message || 'خطأ غير معروف'
    });
  }
};;
