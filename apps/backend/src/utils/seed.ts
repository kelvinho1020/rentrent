import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

/**
 * 產生測試數據，初始化資料庫
 */
async function main() {
  logger.info('開始初始化測試數據...');

  // 清空現有數據（可選）
  await prisma.commuteTime.deleteMany({});
  await prisma.listing.deleteMany({});
  
  logger.info('已清除現有數據，開始創建新數據');

  // 創建台北市測試物件
  const listings = [
    // 台北市大安區
    {
      sourceId: 'test-001',
      title: '大安森林公園旁優質套房',
      price: 18000,
      sizePing: 8.5,
      houseType: '獨立套房',
      roomType: '1房1廳1衛',
      address: '台北市大安區新生南路二段10號',
      district: '大安區',
      city: '台北市',
      description: '近捷運大安森林公園站，生活機能佳，環境清幽',
      imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      facilities: ['陽台', '電梯', '冷氣', '洗衣機'],
      contactName: '王先生',
      contactPhone: '0912345678',
      floor: 5,
      totalFloor: 12,
      longitude: 121.5341,
      latitude: 25.0307,
      source: '591'
    },
    // 台北市信義區
    {
      sourceId: 'test-002',
      title: '信義區精緻兩房',
      price: 32000,
      sizePing: 15.8,
      houseType: '整層住家',
      roomType: '2房1廳1衛',
      address: '台北市信義區松智路12號',
      district: '信義區',
      city: '台北市',
      description: '信義區豪宅，近台北101，交通便利',
      imageUrls: ['https://example.com/img3.jpg', 'https://example.com/img4.jpg'],
      facilities: ['陽台', '電梯', '冷氣', '洗衣機', '冰箱', '熱水器'],
      contactName: '李小姐',
      contactPhone: '0923456789',
      floor: 8,
      totalFloor: 15,
      longitude: 121.5677,
      latitude: 25.0323,
      source: '591'
    },
    // 台北市中山區
    {
      sourceId: 'test-003',
      title: '中山站旁時尚小套房',
      price: 15000,
      sizePing: 6.2,
      houseType: '獨立套房',
      roomType: '1房1衛',
      address: '台北市中山區南京東路二段30號',
      district: '中山區',
      city: '台北市',
      description: '近捷運中山站，商圈生活機能完善',
      imageUrls: ['https://example.com/img5.jpg'],
      facilities: ['電梯', '冷氣', '網路'],
      contactName: '張先生',
      contactPhone: '0934567890',
      floor: 3,
      totalFloor: 7,
      longitude: 121.5228,
      latitude: 25.0526,
      source: '591'
    },
    // 台北市內湖區
    {
      sourceId: 'test-004',
      title: '內湖科學園區三房美寓',
      price: 38000,
      sizePing: 28.5,
      houseType: '整層住家',
      roomType: '3房2廳2衛',
      address: '台北市內湖區內湖路一段88號',
      district: '內湖區',
      city: '台北市',
      description: '鄰近內湖科學園區，交通便利，環境清幽',
      imageUrls: ['https://example.com/img6.jpg', 'https://example.com/img7.jpg'],
      facilities: ['陽台', '電梯', '冷氣', '洗衣機', '冰箱', '熱水器', '車位'],
      contactName: '黃小姐',
      contactPhone: '0945678901',
      floor: 10,
      totalFloor: 12,
      longitude: 121.5766,
      latitude: 25.0794,
      source: '591'
    },
    // 新北市板橋區
    {
      sourceId: 'test-005',
      title: '板橋江子翠捷運站旁兩房',
      price: 22000,
      sizePing: 12.8,
      houseType: '整層住家',
      roomType: '2房1廳1衛',
      address: '新北市板橋區文化路二段55號',
      district: '板橋區',
      city: '新北市',
      description: '近捷運江子翠站，生活機能佳',
      imageUrls: ['https://example.com/img8.jpg'],
      facilities: ['陽台', '電梯', '冷氣', '洗衣機'],
      contactName: '陳先生',
      contactPhone: '0956789012',
      floor: 4,
      totalFloor: 8,
      longitude: 121.4728,
      latitude: 25.0294,
      source: '591'
    }
  ];

  // 批量創建租屋物件
  for (const listing of listings) {
    await prisma.listing.create({
      data: {
        ...listing,
        lastUpdated: new Date(),
        createdAt: new Date()
      }
    });
  }

  logger.info(`成功創建 ${listings.length} 個測試租屋物件`);
}

// 執行並處理錯誤
main()
  .catch((e) => {
    logger.error('數據初始化失敗：', e);
    process.exit(1);
  })
  .finally(async () => {
    // 關閉 Prisma 客戶端連接
    await prisma.$disconnect();
  }); 