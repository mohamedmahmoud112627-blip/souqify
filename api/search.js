// ================================================================
//  ملف: api/search.js
//  الوظيفة: استقبال طلبات البحث، الاتصال بـ AliExpress True API
//  الإصدار: 2.0 (مستقر وقوي) - جاهز للتشغيل الفوري
// ================================================================

// ===== مفتاح RapidAPI الحقيقي (تم وضعه مسبقاً) =====
const RAPID_KEY = 'de78fc5088mshe96721e4e69af36p1f2daejsnd7cfda1a8d7f';
const API_HOST = 'aliexpress-true-api.p.rapidapi.com';

module.exports = async (req, res) => {
  // ----- إعدادات CORS (السماح لأي جهاز بالاتصال) -----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مسموحة',
      message: 'استخدم POST فقط'
    });
  }

  try {
    const { keyword, productId } = req.body;

    const hasKeyword = keyword && keyword.trim() !== '';
    const hasProductId = productId && productId.trim() !== '';

    if (!hasKeyword && !hasProductId) {
      return res.status(400).json({
        success: false,
        error: 'بيانات غير صحيحة',
        message: 'أرسل كلمة بحث (keyword) أو معرف منتج (productId)'
      });
    }

    let apiUrl = '';
    let requestType = '';

    if (hasProductId) {
      requestType = 'product';
      const cleanId = productId.trim();
      apiUrl = `https://${API_HOST}/product?productId=${encodeURIComponent(cleanId)}`;
    } else {
      requestType = 'search';
      const cleanKeyword = keyword.trim();
      apiUrl = `https://${API_HOST}/search?query=${encodeURIComponent(cleanKeyword)}&page=1&categoryId=0`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_KEY,
        'X-RapidAPI-Host': API_HOST,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (_) {
        errorText = 'لم نتمكن من قراءة تفاصيل الخطأ';
      }

      return res.status(response.status).json({
        success: false,
        error: `فشل الاتصال بـ AliExpress (الحالة: ${response.status})`,
        details: errorText.substring(0, 300),
        status: response.status
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      return res.status(500).json({
        success: false,
        error: 'الـ API رجع بيانات غير مفهومة',
        message: 'تعذر تحويل الرد إلى JSON'
      });
    }

    let productsArray = [];

    if (data?.data?.result) {
      productsArray = data.data.result;
    } else if (data?.result) {
      productsArray = data.result;
    } else if (data?.data?.products) {
      productsArray = data.data.products;
    } else if (data?.products) {
      productsArray = data.products;
    } else if (Array.isArray(data)) {
      productsArray = data;
    } else if (data?.data && Array.isArray(data.data)) {
      productsArray = data.data;
    }

    if (requestType === 'product' && (!productsArray || productsArray.length === 0)) {
      if (data?.data && typeof data.data === 'object') {
        productsArray = [data.data];
      } else if (data?.result && typeof data.result === 'object') {
        productsArray = [data.result];
      } else if (data && typeof data === 'object' && data.productId) {
        productsArray = [data];
      }
    }

    if (!productsArray || productsArray.length === 0) {
      return res.status(200).json([]);
    }

    // =============================================================
    // ★★★ المكان الوحيد اللي تحتاج تغيره: كود العمولة ★★★
    // روح على موقع AliExpress Affiliate، خذ كود التتبع بتاعك،
    // واستبدل "YOUR_ALIEXPRESS_AFFILIATE_ID" به.
    // =============================================================
    const affiliateId = 'YOUR_ALIEXPRESS_AFFILIATE_ID'; // <--- غير هذا فقط!

    const products = productsArray
      .filter(item => item !== null && typeof item === 'object')
      .map((item) => ({
        id: item.productId || item.id || item.product_id || Math.random().toString(36).substring(2, 10),
        title: item.title || item.productTitle || item.product_title || 'منتج بدون اسم',
        price: item.price || item.salePrice || item.originalPrice || 'السعر غير متاح',
        image: item.imageUrl || item.image || item.productImage || item.mainImage || 'https://via.placeholder.com/300x300/eeeeee/cccccc?text=No+Image',
        link: `https://s.click.aliexpress.com/e/${affiliateId}?productId=${item.productId || item.id || ''}`
      }));

    return res.status(200).json(products);

  } catch (error) {
    console.error('🔥 خطأ في سيرفر Souqify:', error.message);

    let errorMessage = 'حدث خطأ داخلي في السيرفر';
    let errorDetails = error.message || 'خطأ غير معروف';

    if (error.name === 'AbortError') {
      errorMessage = 'انتهت مهلة الاتصال بـ AliExpress';
      errorDetails = 'الخادم لم يستجب خلال 15 ثانية، حاول مجدداً';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'مشكلة في الاتصال بالإنترنت أو الخادم';
      errorDetails = 'تأكد من اتصالك بالإنترنت وحاول مجدداً';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
};
