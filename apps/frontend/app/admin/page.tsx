"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminPage() {
  const [status, setStatus] = useState({
    listings: { count: "載入中...", status: "loading" },
    users: { count: "載入中...", status: "loading" },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">管理後台</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* 數據統計卡片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">租屋物件</h2>
          <p className="text-3xl font-bold text-primary-600">{status.listings.count}</p>
          <div className="mt-4">
            <Link
              href="/admin/listings"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              管理物件 &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">用戶</h2>
          <p className="text-3xl font-bold text-primary-600">{status.users.count}</p>
          <div className="mt-4">
            <Link
              href="/admin/users"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              管理用戶 &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">數據導入</h2>
          <p className="text-sm text-gray-600 mb-4">
            從爬蟲JSON文件導入租屋物件數據到系統中
          </p>
          <div className="mt-4">
            <Link
              href="/admin/import"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              前往導入頁面 &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 快速操作區域 */}
      <div className="bg-white rounded-lg shadow p-6 mb-12">
        <h2 className="text-xl font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/import"
            className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg text-primary-700 font-medium text-center"
          >
            導入數據
          </Link>
          <Link
            href="/admin/listings"
            className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg text-primary-700 font-medium text-center"
          >
            管理物件
          </Link>
          <Link
            href="/"
            className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg text-primary-700 font-medium text-center"
          >
            前往首頁
          </Link>
        </div>
      </div>

      {/* 系統狀態區域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">系統狀態</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="text-gray-700 font-medium">資料庫連接</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              正常
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="text-gray-700 font-medium">API 服務</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              正常
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="text-gray-700 font-medium">爬蟲服務</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              閒置
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 