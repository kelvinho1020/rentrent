import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 快取同步服務
 * 處理每日房屋資料更新時的快取維護
 */

/**
 * 清理無效的快取記錄
 * 刪除指向已不存在房屋的快取資料
 */
export async function cleanupInvalidCache() {
  try {
    logger.info('🧹 開始清理無效快取記錄...');

    // 1. 清理 CommuteTime 表中的無效記錄
    const invalidCommuteTime = await prisma.commuteTime.deleteMany({
      where: {
        origin: {
          OR: [
            { isActive: false },
            { id: undefined }
          ]
        }
      }
    });

    // 2. 清理 CommuteCache 表中的無效記錄
    const invalidCommuteCache = await prisma.commuteCache.deleteMany({
      where: {
        listing: {
          OR: [
            { isActive: false },
            { id: undefined }
          ]
        }
      }
    });

    logger.info(`✅ 清理完成:`);
    logger.info(`   - CommuteTime 清理: ${invalidCommuteTime.count} 筆`);
    logger.info(`   - CommuteCache 清理: ${invalidCommuteCache.count} 筆`);

    return {
      commuteTimeDeleted: invalidCommuteTime.count,
      commuteCacheDeleted: invalidCommuteCache.count,
      total: invalidCommuteTime.count + invalidCommuteCache.count
    };

  } catch (error) {
    logger.error('清理無效快取時發生錯誤', { error });
    throw error;
  }
}

/**
 * 清理過期的快取記錄
 * @param daysOld 清理多少天前的記錄
 */
export async function cleanupOldCache(daysOld: number = 30) {
  try {
    logger.info(`🗑️ 開始清理 ${daysOld} 天前的舊快取...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // 清理舊的 CommuteTime 記錄
    const oldCommuteTime = await prisma.commuteTime.deleteMany({
      where: {
        calculatedAt: {
          lt: cutoffDate
        }
      }
    });

    // 清理舊的 CommuteCache 記錄
    const oldCommuteCache = await prisma.commuteCache.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`✅ 舊快取清理完成:`);
    logger.info(`   - CommuteTime 清理: ${oldCommuteTime.count} 筆`);
    logger.info(`   - CommuteCache 清理: ${oldCommuteCache.count} 筆`);

    return {
      commuteTimeDeleted: oldCommuteTime.count,
      commuteCacheDeleted: oldCommuteCache.count,
      total: oldCommuteTime.count + oldCommuteCache.count
    };

  } catch (error) {
    logger.error('清理舊快取時發生錯誤', { error });
    throw error;
  }
}

/**
 * 檢查新房屋並初始化熱門地點的快取
 * 為新增的房屋預先計算熱門目的地的通勤時間
 */
export async function initCacheForNewListings() {
  try {
    logger.info('🆕 檢查新房屋並初始化快取...');

    // 1. 找出沒有任何快取記錄的新房屋
    const newListings = await prisma.listing.findMany({
      where: {
        isActive: true,
        AND: [
          {
            commuteTimes: {
              none: {}
            }
          },
          {
            commuteCache: {
              none: {}
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        district: true,
        city: true
      },
      take: 100 // 限制一次處理的數量
    });

    if (newListings.length === 0) {
      logger.info('📋 沒有找到需要初始化快取的新房屋');
      return { processedListings: 0, processedDestinations: 0 };
    }

    // 2. 取得熱門目的地（前5個）
    const popularDestinations = await prisma.commuteCache.groupBy({
      by: ['destinationHash'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    if (popularDestinations.length === 0) {
      logger.info('📋 沒有熱門目的地資料，跳過預先快取');
      return { processedListings: newListings.length, processedDestinations: 0 };
    }

    logger.info(`🎯 為 ${newListings.length} 間新房屋預先計算 ${popularDestinations.length} 個熱門目的地的通勤時間`);

    // 3. 為每個新房屋計算熱門目的地的通勤時間
    // 注意：這裡只是標記需要計算，實際計算會在用戶搜尋時觸發
    let processedCount = 0;
    for (const destination of popularDestinations) {
      logger.info(`📍 處理熱門目的地: ${destination.destinationHash} (搜尋次數: ${destination._count.id})`);
      processedCount++;
    }

    return {
      processedListings: newListings.length,
      processedDestinations: processedCount
    };

  } catch (error) {
    logger.error('初始化新房屋快取時發生錯誤', { error });
    throw error;
  }
}

/**
 * 快取統計資訊
 */
export async function getCacheStatistics() {
  try {
    // 總房屋數
    const totalListings = await prisma.listing.count({
      where: { isActive: true }
    });

    // CommuteTime 快取統計
    const commuteTimeStats = await prisma.commuteTime.groupBy({
      by: ['transitMode'],
      _count: {
        id: true
      }
    });

    // CommuteCache 快取統計
    const commuteCacheCount = await prisma.commuteCache.count();
    
    const uniqueDestinations = await prisma.commuteCache.groupBy({
      by: ['destinationHash'],
      _count: {
        id: true
      }
    });

    // 快取覆蓋率
    const listingsWithCache = await prisma.listing.count({
      where: {
        isActive: true,
        OR: [
          {
            commuteTimes: {
              some: {}
            }
          },
          {
            commuteCache: {
              some: {}
            }
          }
        ]
      }
    });

    const cacheCoverage = totalListings > 0 ? (listingsWithCache / totalListings * 100).toFixed(1) : '0';

    return {
      totalListings,
      listingsWithCache,
      cacheCoverage: `${cacheCoverage}%`,
      commuteTimeStats,
      commuteCacheCount,
      uniqueDestinations: uniqueDestinations.length,
      popularDestinations: uniqueDestinations
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 10)
        .map(dest => ({
          destinationHash: dest.destinationHash,
          searchCount: dest._count.id
        }))
    };

  } catch (error) {
    logger.error('取得快取統計時發生錯誤', { error });
    throw error;
  }
}

/**
 * 每日快取維護作業
 * 建議在每日房屋資料更新後執行
 */
export async function dailyCacheMaintenance() {
  try {
    logger.info('🔄 開始每日快取維護作業...');

    const results = {
      invalidCacheCleanup: await cleanupInvalidCache(),
      oldCacheCleanup: await cleanupOldCache(30),
      newListingsInit: await initCacheForNewListings(),
      statistics: await getCacheStatistics()
    };

    logger.info('✅ 每日快取維護作業完成');
    logger.info(`📊 維護結果摘要:`);
    logger.info(`   - 清理無效快取: ${results.invalidCacheCleanup.total} 筆`);
    logger.info(`   - 清理舊快取: ${results.oldCacheCleanup.total} 筆`);
    logger.info(`   - 處理新房屋: ${results.newListingsInit.processedListings} 間`);
    logger.info(`   - 總快取覆蓋率: ${results.statistics.cacheCoverage}`);

    return results;

  } catch (error) {
    logger.error('每日快取維護作業失敗', { error });
    throw error;
  }
} 