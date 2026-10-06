/** @odoo-module */

// 图片二进制数据首字符 -> mimetype 后缀映射
export const fileTypeMagicWordMap = {
    "/": "jpg",
    R: "gif",
    i: "png",
    P: "svg+xml",
    U: "webp",
};

// 默认占位图
export const PLACEHOLDER_IMAGE = "/web/static/img/placeholder.png";

// 获取大图 URL（将缩略图字段替换为大图字段）
export function getBigImageUrl(src) {
    let bigImageUrl = src;
    if (src.includes("avatar_128") && !src.includes("avatar_128.png")) {
        bigImageUrl = src.replace("avatar_128", "image_1920");
    } else if (src.includes("image_128") && !src.includes("image_128.png")) {
        bigImageUrl = src.replace("image_128", "image_1920");
    }
    return bigImageUrl;
}

// 获取二进制字段的内联 base64 内容。
// 兼容两种数据形态：Odoo 20 的 {content, checksum} 对象，以及旧版 base64 字符串
// （旧版 isBinarySize 判定：长度 < 10000 视为内联 base64，否则为附件存储）。
export function getBinaryContent(value) {
    if (!value) {
        return null;
    }
    if (typeof value === "object") {
        return typeof value.content === "string" ? value.content : null;
    }
    return typeof value === "string" && value.length < 10000 ? value : null;
}

// 获取二进制字段的 checksum（附件存储形态时存在）
export function getBinaryChecksum(value) {
    return typeof value === "object" ? value.checksum : null;
}
