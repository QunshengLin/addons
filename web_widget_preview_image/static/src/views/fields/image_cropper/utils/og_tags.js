/** @odoo-module */
import { _t } from "@web/core/l10n/translation";

// 初始化基础OG标签
export function initBaseOGTags() {
    const head = document.head;
    if (document.querySelector('meta[property="og:type"]')) return;
    
    const baseTags = [
        { property: "og:type", content: "article" },
        { property: "og:url", content: getCleanSignUrl() },
        { property: "og:title", content: "图片分享" },
        { property: "og:description", content: "高清图片分享" },
        { property: "og:site_name", content: "图片分享平台" },
        { property: "og:locale", content: "zh_CN" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "图片分享" },
        { name: "description", content: "高清图片分享" },
    ];

    baseTags.forEach(tag => {
        const meta = document.createElement("meta");
        if (tag.property) meta.setAttribute("property", tag.property);
        if (tag.name) meta.setAttribute("name", tag.name);
        meta.setAttribute("content", tag.content);
        head.appendChild(meta);
    });
}

// 更新OG标签
export function updateOpenGraphTags(imageUrl, width, height) {
    try {
        const updateTags = [
            { property: "og:image", content: imageUrl },
            { property: "og:image:width", content: width.toString() },
            { property: "og:image:height", content: height.toString() },
            { property: "og:image:type", content: "image/jpeg" },
            { property: "og:image:secure_url", content: imageUrl.replace("http://", "https://") },
            { name: "wechat-share-image", content: imageUrl },
            { name: "wechat-share-title", content: "图片分享" },
            { name: "twitter:image", content: imageUrl },
        ];

        updateTags.forEach(tag => {
            let meta;
            if (tag.property) {
                meta = document.querySelector(`meta[property="${tag.property}"]`);
                if (!meta) {
                    meta = document.createElement("meta");
                    meta.setAttribute("property", tag.property);
                    document.head.appendChild(meta);
                }
            } else if (tag.name) {
                meta = document.querySelector(`meta[name="${tag.name}"]`);
                if (!meta) {
                    meta = document.createElement("meta");
                    meta.setAttribute("name", tag.name);
                    document.head.appendChild(meta);
                }
            }
            meta.setAttribute("content", tag.content);
        });
    } catch (err) {
        console.warn("[调试] 更新OG标签失败：", err.message);
    }
}

// 获取纯净的签名URL
export function getCleanSignUrl() {
    let currentUrl = window.location.href;
    currentUrl = currentUrl.split('#')[0];
    const urlObj = new URL(currentUrl);
    const keepParams = [];
    Array.from(urlObj.searchParams.keys()).forEach(key => {
        if (!keepParams.includes(key)) {
            urlObj.searchParams.delete(key);
        }
    });
    return urlObj.href;
}

// 清理OG图片标签
export function clearImageOGTags() {
    document.querySelectorAll('meta[property="og:image"], meta[name="wechat-share-image"]').forEach(tag => tag.remove());
}