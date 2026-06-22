/** @odoo-module */

// 微信 SDK 地址配置


// 文件类型映射
export const fileTypeMagicWordMap = {
    "/": "jpg",
    R: "gif",
    i: "png",
    P: "svg+xml",
    U: "webp",
};

// 默认占位图
export const PLACEHOLDER_IMAGE = "/web/static/img/placeholder.png";

// 图片尺寸常量
export const MIN_IMAGE_SIZE = 300;
export const IMAGE_LOAD_TIMEOUT = 8000;
export const PRELOAD_TIMEOUT = 10000;

