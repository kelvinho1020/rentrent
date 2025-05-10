import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('開始填充資料庫...');

  try {
    // 添加一些示例城市的出租房源
    const cities = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'];
    const districts = {
      '台北市': ['大安區', '信義區', '中山區', '松山區', '文山區'],
      '新北市': ['板橋區', '中和區', '新莊區', '三重區', '永和區'],
      '桃園市': ['桃園區', '中壢區', '平鎮區', '八德區', '龜山區'],
      '台中市': ['西屯區', '北屯區', '南屯區', '太平區', '大里區'],
      '台南市': ['東區', '南區', '中西區', '北區', '安平區'],
      '高雄市': ['左營區', '三民區', '鼓山區', '前金區', '苓雅區'],
    };

    const houseTypes = ['公寓', '電梯大樓', '透天厝', '華廈', '別墅'];
    const roomTypes = ['套房', '雅房', '1房', '2房', '3房', '4房以上'];
    const facilities = [
      '廚房', '陽台', '冷氣', '洗衣機', '冰箱', '熱水器', 
      '第四台', '網路', '床', '衣櫃', '沙發', '桌椅', 
      '停車位', '電梯', '游泳池', '健身房'
    ];

    // 為每個城市創建一些租屋物件
    for (const city of cities) {
      for (const district of districts[city]) {
        // 每個區域創建5個租屋物件
        for (let i = 0; i < 5; i++) {
          const price = Math.floor(Math.random() * 20000) + 10000;
          const sizePing = Math.floor(Math.random() * 30) + 5;
          const houseType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
          const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
          
          // 從設施列表中隨機選擇3-8個
          const selectedFacilities = facilities
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 6) + 3);
          
          // 創建隨機經緯度（大致位於台灣範圍內）
          const latitude = 23.5 + Math.random() * 2.5;  // 約 23.5-26 (台灣範圍)
          const longitude = 120 + Math.random() * 2;    // 約 120-122 (台灣範圍)
          
          // 創建示例租屋物件
          await prisma.listing.create({
            data: {
              sourceId: `test-${city}-${district}-${i}`,
              source: 'seed',
              title: `${city}${district} ${roomType}出租 - 近捷運站`,
              price,
              sizePing,
              houseType,
              roomType,
              address: `${city}${district}測試路${Math.floor(Math.random() * 100) + 1}號`,
              district,
              city,
              description: `位於${city}${district}的舒適${roomType}，交通便利，環境清幽。近捷運站，生活機能佳，隨時可入住。`,
              imageUrls: [
                'https://picsum.photos/800/600',
                'https://picsum.photos/800/601',
                'https://picsum.photos/800/602',
              ],
              facilities: selectedFacilities,
              contactName: '王先生',
              contactPhone: '0912345678',
              floor: Math.floor(Math.random() * 10) + 1,
              totalFloor: Math.floor(Math.random() * 15) + 10,
              longitude,
              latitude,
              isActive: true,
              lastUpdated: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    // 添加示例用戶
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 密碼: secret42
        name: '測試用戶',
        role: 'user',
        isActive: true,
      },
    });

    logger.info('資料庫填充完成！');
  } catch (error) {
    logger.error('填充資料庫時發生錯誤:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 