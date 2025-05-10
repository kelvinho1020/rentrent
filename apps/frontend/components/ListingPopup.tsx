import React from "react";
import ReactDOM from "react-dom";
import { ListingBasic } from "@/types";

type ListingPopupProps = {
  listing: ListingBasic;
};

interface PopupContent {
  render: (containerElement: HTMLElement) => void;
  content: React.ReactNode;
}

// 非直接使用 React.FC，因為需要返回一個對象而不是 ReactNode
const ListingPopup = ({ listing }: ListingPopupProps): PopupContent => {
  const PopupContent = () => (
    <div className="p-1">
      <h3 className="font-bold text-lg mb-1 text-primary-600">{listing.title}</h3>
      <div className="text-xl font-medium mb-2">NT$ {listing.price.toLocaleString()}</div>
      <div className="mb-2 text-sm">
        <span className="inline-block mr-2 px-2 py-1 bg-gray-100 rounded-md">
          {listing.size_ping} 坪
        </span>
        <span className="inline-block mr-2 px-2 py-1 bg-gray-100 rounded-md">
          {listing.district}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-1">{listing.address}</div>
      {listing.commute_time !== undefined && (
        <div className="mt-2 text-sm text-green-600 font-medium">
          通勤時間: {listing.commute_time} 分鐘
        </div>
      )}
      <a
        href={`/listings/${listing.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-800"
      >
        查看詳情 →
      </a>
    </div>
  );

  // 提供 render 方法用於渲染 Popup 內容到 DOM 元素
  const render = (containerElement: HTMLElement) => {
    ReactDOM.render(<PopupContent />, containerElement);
  };

  return {
    render,
    content: <PopupContent />,
  };
};

export default ListingPopup; 