const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cfimyvvecsoqeicsjezo.supabase.co';
const supabaseKey = 'sb_publishable_bjxEVwosmmdWQ6_N4_jPhQ_Xo6zDtqp'; // Note: This is an ANON key, it might have RLS restrictions.
const supabase = createClient(supabaseUrl, supabaseKey);

const products = [
  {
    name: '연천 명품 오대쌀 (10kg)',
    description: '임진강의 맑은 물과 연천의 비옥한 토양에서 자란 최고급 오대쌀입니다. 낮은 단백질 함량으로 밥맛이 달고 찰기가 오래 유지됩니다.',
    price: 38000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1527335441301-49666e60b691?auto=format&fit=crop&q=80&w=800'
    ],
    detail_content_images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1200'
    ],
    stock: 100,
    specs: { origin: '경기도 연천군', weight: '10kg', producer: '복이네농장(주)' }
  },
  {
    name: '당도 최고 꿀고구마 (5kg)',
    description: '황토밭에서 정성껏 길러낸 베니하루카 품종의 꿀고구마입니다. 숙성될수록 깊어지는 단맛과 부드러운 식감을 자랑합니다.',
    price: 24000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
    images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800'],
    detail_content_images: ['https://images.unsplash.com/photo-1444858291040-58f756a3bbb6?auto=format&fit=crop&q=80&w=1200'],
    stock: 150,
    specs: { origin: '경기도 연천군', weight: '5kg', producer: '복이네농장(주)' }
  },
  {
    name: '전통 무쇠 가마솥 (중)',
    description: '대를 이어 내려온 장인의 손길로 제작된 전통 무쇠 가마솥입니다. 열전도율이 뛰어나 밥맛을 살려주고 건강한 요리를 돕습니다.',
    price: 125000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=800',
    images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=800'],
    detail_content_images: ['https://images.unsplash.com/photo-1591261735099-e130bdb61930?auto=format&fit=crop&q=80&w=1200'],
    stock: 20,
    specs: { material: '무쇠', weight: '8kg', manufacturer: '자연의결 협력사' }
  }
];

async function updateDatabase() {
  console.log('Starting Supabase direct data update...');
  
  // 1. Clear existing products (optional, for clean start)
  const { error: delError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) console.error('Delete error:', delError);

  // 2. Insert high-quality products
  const { data, error } = await supabase.from('products').insert(products).select();
  
  if (error) {
    console.error('Error inserting products:', error);
  } else {
    console.log('Successfully inserted', data.length, 'high-quality products!');
  }
}

updateDatabase();
