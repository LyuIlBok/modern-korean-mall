export type Category = '농산물' | '농자재';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
}

export const products: Product[] = [
  {
    id: 'p1',
    name: '유기농 철원 오대쌀 10kg',
    description: '기름진 땅과 맑은 물이 빚어낸 찰진 밥맛의 정수입니다. 자연 그대로의 정직함을 담았습니다.',
    price: 45000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'p2',
    name: '지리산 야생화 꿀',
    description: '깊은 산속 야생화의 진한 향과 달콤함을 그대로 병에 담았습니다. 건강한 단맛을 즐겨보세요.',
    price: 32000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1587049352847-8d4e8941b958?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'p3',
    name: '제주 친환경 흙당근 3kg',
    description: '제주의 화산송이 흙에서 자라 단맛이 강하고 수분이 풍부한 프리미엄 당근입니다.',
    price: 18000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'p4',
    name: '무농약 고랭지 배추',
    description: '일교차가 큰 고랭지에서 재배하여 속이 꽉 차고 아삭한 식감이 일품인 배추입니다.',
    price: 25000,
    category: '농산물',
    imageUrl: 'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'm1',
    name: '친환경 코코피트 배양토 50L',
    description: '뿌리 발달을 돕고 통기성이 우수한 최고급 배양토입니다. 실내외 가드닝에 적합합니다.',
    price: 12000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1416879598555-337b58c56cc5?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'm2',
    name: '전통 무쇠 호미',
    description: '장인의 손길로 벼려낸 튼튼하고 묵직한 전통 호미입니다. 깊은 땅도 쉽게 팰 수 있습니다.',
    price: 15000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1585428453472-8eebe0661ff7?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'm3',
    name: '천연 생분해 멀칭 필름 100m',
    description: '수확 후 밭에 그대로 두어도 자연 분해되는 친환경 멀칭 필름으로 환경을 보호합니다.',
    price: 28000,
    category: '농자재',
    imageUrl: 'https://images.unsplash.com/photo-1592085198818-727878844883?auto=format&fit=crop&q=80&w=800',
  }
];