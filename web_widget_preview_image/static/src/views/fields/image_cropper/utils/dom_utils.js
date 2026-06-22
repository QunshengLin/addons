/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
// 静态导入所有需要的模块（核心修复）
import { clearImageOGTags } from "./og_tags";
import { getBigImageUrl } from "./image_utils";
import { preloadImage, checkImageValidity } from "./image_utils";
import { updateOpenGraphTags } from "./og_tags";
import { MIN_IMAGE_SIZE } from "../constants";

// 全局事件处理函数
export let handleMouseDown, handleMouseMove, handleMouseUp;

// 创建按钮辅助函数
export function createButton({ className, innerHTML, style, onClick }) {
    const button = document.createElement("button");
    button.classList.add(className);
    button.innerHTML = innerHTML;
    Object.assign(button.style, {
        position: "fixed",
        padding: "8px 12px",
        background: "none",
        border: "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "16px",
        zIndex: 10050,
        cursor: "pointer",
        transition: "background 0.2s"
    });
    Object.assign(button.style, style);
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
    });

    button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0,0,0,0.8)";
    });
    button.addEventListener("mouseleave", () => {
        button.style.background = "rgba(0,0,0,0.5)";
    });
    return button;
}

// 移除放大图片
export function removeEnlargedImage() {
    const elements = [
        ".enlarged-image", ".blurred-bg", ".close-button", ".zoom-button",
        ".share-button", ".print-button", ".reset-button", ".download-button",
        ".fit-button", ".rotate-button"
    ];
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) document.body.removeChild(el);
    });

    // 只移除图片相关的OG标签，保留基础标签
    clearImageOGTags();
    document.body.classList.remove("enlarged-image-body");

    // 移除图片拖动事件监听
    const img = document.querySelector('.enlarged-image');
    if (img) {
        img.removeEventListener("mousedown", handleMouseDown);
        img.removeEventListener("touchstart", handleMouseDown);
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("touchmove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchend", handleMouseUp);

    // 重置全局变量
    delete window.imgXOffset;
    delete window.imgYOffset;
    delete window.imgRotation;
    delete window.imgIsDragging;
    delete window.imgInitialX;
    delete window.imgInitialY;
}

// 初始化图片拖动事件（修复触摸事件警告）
export function initImageDragEvents(newImg) {
    // 初始化图片拖动变量
    window.imgXOffset = 0;
    window.imgYOffset = 0;
    window.imgRotation = 0;
    window.imgIsDragging = false;

    // 定义拖动事件处理函数
    handleMouseDown = (e) => {
        window.imgIsDragging = true;
        window.imgInitialX = (e.clientX || e.touches[0].clientX) - window.imgXOffset;
        window.imgInitialY = (e.clientY || e.touches[0].clientY) - window.imgYOffset;
    };

    handleMouseMove = (e) => {
        if (!window.imgIsDragging) return;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        window.imgXOffset = clientX - window.imgInitialX;
        window.imgYOffset = clientY - window.imgInitialY;
        newImg.style.transform = `translate3d(${window.imgXOffset}px, ${window.imgYOffset}px, 0) rotate(${window.imgRotation || 0}deg)`;
    };

    handleMouseUp = () => {
        window.imgIsDragging = false;
    };

    // 修复触摸事件警告：添加 passive: true
    newImg.addEventListener("mousedown", handleMouseDown);
    newImg.addEventListener("touchstart", handleMouseDown, { passive: true }); // 关键修复
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleMouseMove, { passive: true }); // 关键修复
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp, { passive: true }); // 关键修复

    // 双击放大
    newImg.addEventListener("dblclick", () => {
        newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
        newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
    });

    return { handleMouseDown, handleMouseMove, handleMouseUp };
}

// 图片点击预览主函数（移除所有动态导入）
export async function img_click(ev, component) {
    ev.stopPropagation();
    ev.preventDefault();

    const clickedImg = ev.target;
    if (!clickedImg || clickedImg.tagName !== 'IMG') return;
    if (document.body.classList.contains("enlarged-image-body")) {
        removeEnlargedImage();
        return;
    }

    const src = clickedImg.src;
    const bigImageUrl = getBigImageUrl(src);

    try {
        component.notification.add(_t("正在初始化图片预览..."), { type: "info" });

        // 直接使用静态导入的函数（不再动态导入）
        const preloadResult = await preloadImage(bigImageUrl);
        updateOpenGraphTags(bigImageUrl, preloadResult.width, preloadResult.height);
        // 修改为视图加载用原生的代替
        // component.notification.add(_t("图片预览初始化完成"), { type: "success" });
    } catch (err) {
        console.error("[调试] 初始化失败：", err);
        component.notification.add(_t("初始化失败：") + err.message, { type: "warning" });
    }

    // 创建大图元素
    const newImg = document.createElement("img");
    newImg.src = bigImageUrl;
    newImg.classList.add("enlarged-image");
    Object.assign(newImg.style, {
        position: "fixed",
        top: 0, bottom: 0, left: 0, right: 0,
        margin: "auto",
        maxWidth: "98%",
        maxHeight: "98%",
        zIndex: 10050,
        cursor: "move",
        transition: "transform 0.1s ease"
    });

    // 创建背景遮罩
    const blurredBg = document.createElement("div");
    blurredBg.classList.add("blurred-bg");
    Object.assign(blurredBg.style, {
        position: "fixed",
        top: 0, bottom: 0, left: 0, right: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 10049
    });

    // 创建按钮
    const closeButton = createButton({
        className: "close-button",
        innerHTML: "❎",
        style: { top: "10px", right: "10px" },
        onClick: () => {
            removeEnlargedImage();
        }
    });

    const zoomButton = createButton({
        className: "zoom-button",
        innerHTML: "🔍",
        style: { top: "10px", left: "10px" },
        onClick: () => {
            newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
            newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
        }
    });

    // 其他功能按钮
    const resetButton = createButton({
        className: "reset-button",
        innerHTML: "🔄",
        style: { bottom: "10px", right: "10px" },
        onClick: () => {
            newImg.style.transform = "translate3d(0, 0, 0)";
            newImg.style.maxWidth = "98%";
            newImg.style.maxHeight = "98%";
            window.imgXOffset = 0;
            window.imgYOffset = 0;
            window.imgRotation = 0;
        }
    });

    const printButton = createButton({
        className: "print-button",
        innerHTML: "🖨️",
        style: { bottom: "10px", left: "10px" },
        onClick: () => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`<img src="${newImg.src}" style="width:100%;"/>`);
            printWindow.document.close();
            printWindow.print();
        }
    });

    const fitButton = createButton({
        className: "fit-button",
        innerHTML: "⛶", // 改用适配/全屏图标
        style: { bottom: "10px", left: "100px" },
        onClick: () => {
            newImg.style.maxWidth = "100vw";
            newImg.style.maxHeight = "100vh";
            newImg.style.width = "auto";
            newImg.style.height = "auto";
        }
    });

    const rotateButton = createButton({
        className: "rotate-button",
        innerHTML: "🕹️",
        style: { bottom: "10px", left: "50px" },
        onClick: () => {
            window.imgRotation = (window.imgRotation || 0) + 90;
            newImg.style.transform = `translate3d(${window.imgXOffset || 0}px, ${window.imgYOffset || 0}px, 0) rotate(${window.imgRotation}deg)`;
        }
    });

    const downloadButton = createButton({
        className: "download-button",
        innerHTML: "💾",
        style: { bottom: "10px", right: "50px" },
        onClick: () => {
            const a = document.createElement("a");
            a.href = newImg.src;
            a.download = `image_${new Date().getTime()}.jpg`;
            a.click();
            if (a.href.startsWith('blob:')) {
                URL.revokeObjectURL(a.href);
            }
        }
    });

    // 初始化拖动事件
    initImageDragEvents(newImg);

    // 点击背景关闭
    blurredBg.addEventListener("click", () => {
        removeEnlargedImage();
    });

    // 添加所有元素到页面
    const elements = [blurredBg, newImg, closeButton, zoomButton,
        resetButton, printButton, fitButton, rotateButton, downloadButton];
    elements.forEach(el => document.body.appendChild(el));
    document.body.classList.add("enlarged-image-body");
}