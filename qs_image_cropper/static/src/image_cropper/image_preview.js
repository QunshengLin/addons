/** @odoo-module */
import { getBigImageUrl } from "./utils";
import { _t } from "@web/core/l10n/translation";

// 全局事件处理函数
export let handleMouseDown, handleMouseMove, handleMouseUp;

// 创建悬浮按钮（className 可包含多个类；qs-oi-scope 用于启用 Material Symbols Rounded 图标字体）
export function createButton({ className, innerHTML, style, onClick }) {
    const button = document.createElement("button");
    button.classList.add(...className.split(/\s+/));
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
        if (el) el.remove();
    });

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

// 初始化图片拖动事件
export function initImageDragEvents(newImg) {
    window.imgXOffset = 0;
    window.imgYOffset = 0;
    window.imgRotation = 0;
    window.imgIsDragging = false;

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

    newImg.addEventListener("mousedown", handleMouseDown);
    newImg.addEventListener("touchstart", handleMouseDown, { passive: true });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp, { passive: true });

    // 双击放大
    newImg.addEventListener("dblclick", () => {
        newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
        newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
    });

    return { handleMouseDown, handleMouseMove, handleMouseUp };
}

// 图片点击预览主函数
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

    // 创建按钮（Odoo 20 oi 图标：Material Symbols Rounded + OI 美化）
    const closeButton = createButton({
        className: "close-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="close"></i>`,
        style: { top: "10px", right: "10px" },
        onClick: () => removeEnlargedImage()
    });

    const zoomButton = createButton({
        className: "zoom-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="zoom_in"></i>`,
        style: { top: "10px", left: "10px" },
        onClick: () => {
            newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
            newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
        }
    });

    // 分享按钮（使用浏览器原生分享）
    const shareButton = createButton({
        className: "share-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="share"></i>`,
        style: { top: "10px", left: "60px" },
        onClick: async () => {
            if (navigator.share) {
                try {
                    await navigator.share({ title: _t("Image Sharing"), text: _t("High-resolution image sharing"), url: bigImageUrl });
                } catch (err) {
                    component.notification.add(err.message, { type: "warning" });
                }
            } else {
                component.notification.add(_t("Please right-click to save the image, then share it"), { type: "info" });
            }
        }
    });

    // 重置按钮
    const resetButton = createButton({
        className: "reset-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="refresh"></i>`,
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

    // 打印按钮
    const printButton = createButton({
        className: "print-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="print"></i>`,
        style: { bottom: "10px", left: "10px" },
        onClick: () => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`<img src="${newImg.src}" style="width:100%;"/>`);
            printWindow.document.close();
            printWindow.print();
        }
    });

    // 适配屏幕按钮
    const fitButton = createButton({
        className: "fit-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="fullscreen"></i>`,
        style: { bottom: "10px", left: "100px" },
        onClick: () => {
            newImg.style.maxWidth = "100vw";
            newImg.style.maxHeight = "100vh";
            newImg.style.width = "auto";
            newImg.style.height = "auto";
        }
    });

    // 旋转按钮
    const rotateButton = createButton({
        className: "rotate-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="rotate_right"></i>`,
        style: { bottom: "10px", left: "50px" },
        onClick: () => {
            window.imgRotation = (window.imgRotation || 0) + 90;
            newImg.style.transform = `translate3d(${window.imgXOffset || 0}px, ${window.imgYOffset || 0}px, 0) rotate(${window.imgRotation}deg)`;
        }
    });

    // 下载按钮
    const downloadButton = createButton({
        className: "download-button qs-oi-scope",
        innerHTML: `<i class="oi oi-fw" data-icon="download"></i>`,
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
    blurredBg.addEventListener("click", () => removeEnlargedImage());

    // 添加所有元素到页面
    const elements = [blurredBg, newImg, closeButton, zoomButton, shareButton,
        resetButton, printButton, fitButton, rotateButton, downloadButton];
    elements.forEach(el => document.body.appendChild(el));
    document.body.classList.add("enlarged-image-body");
}
