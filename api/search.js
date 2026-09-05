module.exports = async (req, res) => {
  // نخلي الموقع يقبل الطلبات
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة غير مسموحة' });
  }

  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'اكتب اسم المنتج' });

  try {
    const response = await fetch(
      `https://ali-express-api1.p.rapidapi.com/search?query=${encodeURIComponent(keyword)}&page=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_KEY,
          'X-RapidAPI-Host': 'ali-express-api1.p.rapidapi.com'
        }
      }
    );
    const data = await response.json();
    
    // حول البيانات لشكل جميل (وحط بدل YOUR_ID كود العمولة بتاعك من علي اكسبريس)
    const products = data.result.map(item => ({
      id: item.productId,
      title: item.title,
      price: item.price + ' دولار',
      image: item.imageUrl,
      link: `https://s.click.aliexpress.com/e/_de78fc5088mshe96721e4e69af36p1f2daejsnd7cfda1a8d7f?productId=${item.productId}`
    }));
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'حصل عطل في السيرفر' });
  }
};
