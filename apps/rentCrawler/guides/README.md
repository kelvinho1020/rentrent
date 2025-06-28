# Python Docker & 爬蟲學習指南

本資料夾包含了Python開發、Docker環境配置和網頁爬蟲的相關指南文件。

## 指南目錄

1. [Docker與Python環境配置指南](docker-python-guide.md) - 學習如何使用Docker管理Python環境
2. [網頁爬蟲入門指南](crawler_guide.md) - 學習使用BeautifulSoup和Selenium進行網頁爬蟲

## 快速開始

1. 構建並啟動Docker容器:
   ```bash
   docker-compose up -d --build
   ```

2. 運行爬蟲示例:
   ```bash
   docker-compose exec app bash
   python crawler_example.py
   python bs4_example.py
   ```

## 目錄結構

```
project/
├── guides/                  # 指南文件夾
│   ├── README.md            # 指南索引
│   ├── docker-python-guide.md  # Docker與Python指南
│   └── crawler_guide.md     # 爬蟲指南
├── app.py                   # 示例應用
├── crawler_example.py       # Selenium爬蟲示例
├── bs4_example.py           # BeautifulSoup爬蟲示例
├── Dockerfile               # Docker容器配置
├── docker-compose.yml       # Docker服務配置
└── requirements.txt         # Python依賴列表
```
