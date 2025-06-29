import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "關於我們 - RentRent",
	description: "了解 RentRent 租屋搜尋平台的服務內容和資料來源",
};

export default function AboutPage() {
	return (
		<div className="min-h-full bg-gray-50">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				{/* 頁面標題 */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">關於我們</h1>
					<p className="text-xl text-gray-600">了解 RentRent 租屋搜尋平台</p>
				</div>

				{/* 主要內容 */}
				<div className="space-y-8">
					{/* 服務介紹 */}
					<section className="bg-white rounded-lg shadow-md p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
							<span className="mr-3">🏠</span>
							我們的服務
						</h2>
						<p className="text-gray-700 text-lg leading-relaxed">
							RentRent 是一個以通勤時間為核心的租屋搜尋平台，致力於幫助使用者輕鬆找到離工作地點近的理想住所。
							我們整合了租屋資訊和地圖服務，讓您可以直觀地查看租屋位置，並根據通勤時間和預算快速篩選出最適合的房源。
						</p>
					</section>

					{/* 資料來源 */}
					<section className="bg-white rounded-lg shadow-md p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
							<span className="mr-3">📊</span>
							資料來源
						</h2>
						<div className="space-y-4">
							<p className="text-gray-700 text-lg leading-relaxed">
								我們的租屋資料來源於 <strong>rent.houseprice.tw</strong>，這是一個可靠的房產資訊平台。
							</p>
							<div className="bg-blue-50 border-l-4 border-blue-400 p-4">
								<div className="flex">
									<div className="flex-shrink-0">
										<span className="text-blue-400 text-xl">ℹ️</span>
									</div>
									<div className="ml-3">
										<p className="text-blue-800">
											<strong>服務範圍：</strong>目前我們專注於提供台北市和新北市的租屋資訊
										</p>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* 更新頻率 */}
					<section className="bg-white rounded-lg shadow-md p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
							<span className="mr-3">🔄</span>
							資料更新
						</h2>
						<div className="grid md:grid-cols-2 gap-6">
							<div className="bg-green-50 rounded-lg p-6">
								<h3 className="text-lg font-semibold text-green-800 mb-2">台北市</h3>
								<p className="text-green-700">每日更新 40 筆最新租屋資訊</p>
							</div>
							<div className="bg-blue-50 rounded-lg p-6">
								<h3 className="text-lg font-semibold text-blue-800 mb-2">新北市</h3>
								<p className="text-blue-700">每日更新 40 筆最新租屋資訊</p>
							</div>
						</div>
						<p className="text-gray-600 mt-4 text-center">
							每天定時更新，確保您獲得最新的租屋資訊
						</p>
					</section>

					{/* 特色功能 */}
					<section className="bg-white rounded-lg shadow-md p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
							<span className="mr-3">✨</span>
							特色功能
						</h2>
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div className="text-center">
								<div className="text-3xl mb-2">🗺️</div>
								<h3 className="font-semibold text-gray-900 mb-2">地圖檢視</h3>
								<p className="text-gray-600 text-sm">直觀的地圖介面，輕鬆查看房源位置</p>
							</div>
							<div className="text-center">
								<div className="text-3xl mb-2">🚇</div>
								<h3 className="font-semibold text-gray-900 mb-2">通勤計算</h3>
								<p className="text-gray-600 text-sm">以通勤時間為核心的搜尋體驗</p>
							</div>
							<div className="text-center">
								<div className="text-3xl mb-2">💰</div>
								<h3 className="font-semibold text-gray-900 mb-2">價格篩選</h3>
								<p className="text-gray-600 text-sm">根據預算快速篩選適合的房源</p>
							</div>
						</div>
					</section>

					{/* 聯絡資訊 */}
					<section className="bg-primary-600 text-white rounded-lg p-8 text-center">
						<h2 className="text-2xl font-bold mb-4">聯絡我們</h2>
						<p className="text-primary-100 mb-4">
							如果您有任何問題或建議，歡迎隨時聯絡我們
						</p>
						<p className="text-primary-200">
							Email: <a href="mailto:contact@rentrent.tw" className="text-white underline hover:text-primary-100">contact@rentrent.tw</a>
						</p>
					</section>
				</div>
			</div>
		</div>
	);
} 