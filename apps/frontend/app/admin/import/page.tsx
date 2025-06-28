"use client";

import React, { useState, useRef } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [statusData, setStatusData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 檢查導入狀態
  const checkImportStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/import/status`);
      setStatusData(response.data);
      setMessage("已獲取最新狀態");
    } catch (error) {
      setMessage("獲取狀態失敗");
      console.error("獲取導入狀態失敗", error);
    }
  };

  // 處理文件選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json")) {
        setFile(selectedFile);
        setMessage(`已選擇文件: ${selectedFile.name}`);
      } else {
        setFile(null);
        setMessage("請選擇 JSON 文件");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // 處理文件上傳
  const handleImport = async () => {
    if (!file) {
      setMessage("請先選擇文件");
      return;
    }

    setImportStatus("uploading");
    setMessage("文件上傳中...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/import/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImportStatus("success");
      setMessage(`上傳成功: ${response.data.message}`);
      
      // 上傳成功後檢查狀態
      setTimeout(checkImportStatus, 1000);
      
      // 清除文件選擇
      resetForm();
    } catch (error) {
      setImportStatus("error");
      setMessage("上傳失敗，請重試");
      console.error("上傳失敗", error);
    }
  };

  // 重置表單
  const resetForm = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">租屋數據導入</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">上傳 JSON 文件</h2>
        
        <div className="mb-4">
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
            選擇 JSON 格式的爬蟲數據文件
          </label>
          <input
            type="file"
            id="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
        </div>
        
        {file && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">文件名:</span> {file.name}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">大小:</span> {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={!file || importStatus === "uploading"}
            className={`btn ${
              !file || importStatus === "uploading"
                ? "bg-gray-300 cursor-not-allowed"
                : "btn-primary"
            }`}
          >
            {importStatus === "uploading" ? "上傳中..." : "導入數據"}
          </button>
          
          <button onClick={resetForm} className="btn btn-secondary">
            重置
          </button>
          
          <button onClick={checkImportStatus} className="btn btn-secondary">
            檢查狀態
          </button>
        </div>
        
        {message && (
          <div
            className={`mt-4 p-3 rounded-md ${
              importStatus === "error"
                ? "bg-red-50 text-red-700"
                : importStatus === "success"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* 顯示導入狀態 */}
      {statusData && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">導入狀態</h2>
          
          <div className="mb-3">
            <span className="font-medium">當前狀態:</span>{" "}
            {statusData.status === "processing" ? (
              <span className="text-yellow-600">正在處理</span>
            ) : (
              <span className="text-green-600">閒置</span>
            )}
          </div>
          
          {statusData.lastImport && (
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">最近一次導入</h3>
              
              {statusData.lastImport.startTime && (
                <p className="text-sm mb-1">
                  <span className="font-medium">開始時間:</span>{" "}
                  {new Date(statusData.lastImport.startTime).toLocaleString()}
                </p>
              )}
              
              {statusData.lastImport.endTime && (
                <p className="text-sm mb-1">
                  <span className="font-medium">結束時間:</span>{" "}
                  {new Date(statusData.lastImport.endTime).toLocaleString()}
                </p>
              )}
              
              {statusData.lastImport.filePath && (
                <p className="text-sm mb-1">
                  <span className="font-medium">文件路徑:</span>{" "}
                  {statusData.lastImport.filePath}
                </p>
              )}
              
              {statusData.lastImport.results && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm mb-1">
                    <span className="font-medium">新增:</span>{" "}
                    {statusData.lastImport.results.imported} 筆
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">更新:</span>{" "}
                    {statusData.lastImport.results.updated} 筆
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">跳過:</span>{" "}
                    {statusData.lastImport.results.skipped} 筆
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">錯誤:</span>{" "}
                    {statusData.lastImport.results.errors} 筆
                  </p>
                  <p className="text-sm font-medium mt-1">
                    總計:{" "}
                    {statusData.lastImport.results.imported +
                      statusData.lastImport.results.updated +
                      statusData.lastImport.results.skipped +
                      statusData.lastImport.results.errors}{" "}
                    筆
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 