export type Category = '농산물' | '농자재';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  shipping_fee: number;
  images?: string[];
  detail_content_images?: string[];
  stock: number;
  is_sold_out: boolean;
  discount_rate?: number; // 추가
  reward_points?: number; // 추가
  specs?: {
    origin?: string;
    producer?: string;
    [key: string]: any;
  };
}

export const products: Product[] = [
  {
    id: '1',
    name: '연천 비무장지대 오대쌀 10kg',
    description: '청정 연천 민통선 부근에서 자라 밥맛이 일품인 햅쌀입니다. 단단한 질감과 단맛이 특징입니다.',
    price: 38000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 50,
    is_sold_out: false,
  },
  {
    id: '2',
    name: '복이네 유기농 꿀고구마 5kg',
    description: '서리가 내린 후 수확하여 당도가 최고조에 달한 베니하루카 꿀고구마입니다.',
    price: 24000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 15,
    is_sold_out: false,
  },
  {
    id: '3',
    name: '전통 수제 가마솥 솥틀',
    description: '무형문화재 장인이 직접 두드려 만든 무쇠 솥틀입니다. 세대를 이어 사용하는 견고함을 자랑합니다.',
    price: 155000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1584947897551-36fd37482674?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 3,
    is_sold_out: false,
  },
  {
    id: '4',
    name: '친환경 대나무 바구니 (소)',
    description: '담양의 질 좋은 대나무를 엮어 만든 소품 바구니입니다. 통기성이 좋아 채소 보관에 적합합니다.',
    price: 12000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1590650516494-23253a08f4ee?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 20,
    is_sold_out: false,
  },
  {
    id: '5',
    name: '서리태 콩 (강화도산) 2kg',
    description: '해풍을 맞고 자라 속이 더욱 파랗고 영양이 풍부한 명품 서리태입니다.',
    price: 28000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1551462147-ff29053fad68?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 45,
    is_sold_out: false,
  },
  {
    id: '6',
    name: '자연분해 멀칭 필름',
    description: '수확 후 밭에 그대로 두어도 자연 분해되는 친환경 멀칭 필름으로 환경을 보호합니다.',
    price: 28000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&q=80&w=800',
    shipping_fee: 0,
    stock: 100,
    is_sold_out: false,
  }
];
