/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
import { MIN_IMAGE_SIZE, IMAGE_LOAD_TIMEOUT, PRELOAD_TIMEOUT } from "../constants";

// 图片预加载
export async function preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl + "?t=" + new Date().getTime();
        
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        
        img.onerror = () => reject(new Error("图片预加载失败"));
        setTimeout(() => reject(new Error("图片预加载超时")), PRELOAD_TIMEOUT);
    });
}

// 图片有效性校验
export function checkImageValidity(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const timeout = setTimeout(() => {
            resolve({
                valid: false,
                error: _t("大图加载超时，请检查图片URL是否为公网可访问"),
                width: 0,
                height: 0
            });
        }, IMAGE_LOAD_TIMEOUT);

        img.onload = () => {
            clearTimeout(timeout);
            const width = img.width;
            const height = img.height;
            
            const isBackgroundImage = width === 200 && height === 200;
            if (isBackgroundImage) {
                resolve({
                    valid: false,
                    error: _t("获取到的是背景图，微信爬虫权限未放行"),
                    width,
                    height
                });
                return;
            }

            if (width >= MIN_IMAGE_SIZE && height >= MIN_IMAGE_SIZE) {
                resolve({
                    valid: true,
                    error: "",
                    width,
                    height
                });
            } else {
                resolve({
                    valid: false,
                    error: _t(`大图尺寸不足（当前${width}x${height}），需≥${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE}像素`),
                    width,
                    height
                });
            }
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve({
                valid: false,
                error: _t("大图无法访问，请检查URL是否正确/公网可访问"),
                width: 0,
                height: 0
            });
        };

        img.src = imageUrl + "?t=" + new Date().getTime();
    });
}

// 获取大图URL
export function getBigImageUrl(src) {
    let bigImageUrl = src;
    if (src.includes("avatar_128") && !src.includes("avatar_128.png")) {
        bigImageUrl = src.replace("avatar_128", "image_1920");
    } else if (src.includes("image_128") && !src.includes("image_128.png")) {
        bigImageUrl = src.replace("image_128", "image_1920");
    }
    return bigImageUrl;
}