import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RentRent - 租屋搜尋平台",
  description: "以通勤時間為核心的租屋搜尋平台，讓您輕鬆找到離工作地點近的理想住所。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">
        <main className="flex flex-col min-h-screen">
          <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">RentRent</h1>
                <span className="ml-2 text-sm text-gray-500">租屋搜尋平台</span>
              </div>
              <nav>
                <ul className="flex space-x-6">
                  <li>
                    <a href="/" className="text-gray-700 hover:text-primary-600">
                      首頁
                    </a>
                  </li>
                  <li>
                    <a href="/about" className="text-gray-700 hover:text-primary-600">
                      關於我們
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
          <div className="flex-1 overflow-y-scroll">
            {children}
          </div>
          <footer className="bg-gray-900 text-white py-6">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between">
                <div className="mb-4 md:mb-0">
                  <h2 className="text-xl font-bold mb-2">RentRent</h2>
                  <p className="text-gray-400">以通勤時間為核心的租屋搜尋平台</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">聯絡我們</h3>
                  <p className="text-gray-400">Email: rentrent@rent.rent</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800 text-center text-gray-500 text-sm">
                © {new Date().getFullYear()} RentRent. All rights reserved.
              </div>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
} 