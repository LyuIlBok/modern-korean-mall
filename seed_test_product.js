const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedTestProduct() {
  const { data, error } = await supabase.from('products').insert([{
    name: '결제 테스트용 100원 상품',
    price: 100,
    shipping_fee: 0,
    stock: 999,
    category: '농산물',
    description: '결제 연동 테스트를 위한 100원 상품입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
    is_sold_out: false,
    specs: { origin: '연천군', producer: '복이네농장' }
  }]).select();

  if (error) {
    console.error('Error seeding product:', error.message);
  } else {
    console.log('Test product seeded successfully:', data);
  }
}

seedTestProduct();
