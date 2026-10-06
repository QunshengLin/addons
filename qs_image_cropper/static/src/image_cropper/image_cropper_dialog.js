/** @odoo-module */
import { isMobileOS } from "@web/core/browser/feature_detection";
import { _t } from "@web/core/l10n/translation";
import { Dialog } from "@web/core/dialog/dialog";
import { Component, onMounted, onWillUnmount, proxy, signal, t, useProps } from "@odoo/owl";
import { loadJS, loadCSS } from "@web/core/assets";

// cropperjs 1.6.1
const CROPPER_CSS_URL = "/qs_image_cropper/static/lib/cropperjs/cropper.min.css";
const CROPPER_JS_URL = "/qs_image_cropper/static/lib/cropperjs/cropper.min.js";

export const imageCropperDialogProps = {
    imageSrc: t.string(),
    onSave: t.function(),
    record: t.object().optional(),
    name: t.string().optional(),
    close: t.function().optional(() => {}),
};

// 图片编辑器弹窗组件
export class ImageCropperDialog extends Component {
    static template = "qs_image_cropper.ImageCropperDialog";

    static components = { Dialog };

    props = useProps(imageCropperDialogProps);

    // DOM 引用（OWL 3：t-ref 绑定 signal）
    imageRef = signal(null, { type: t.ref() });

    setup() {
        this.isMobile = isMobileOS();
        this.title = _t("Image Compile");

        // 状态管理
        this.state = proxy({
            isLoading: true,
            hasError: false,
            errorMessage: "",
            isCropping: false,
        });

        // 核心变量
        this.originalImageSrc = null; // 原始图片URL
        this.cropper = null; // Cropper实例
        this.Cropper = null; // Cropper构造函数

        // 组件卸载时清理资源
        onWillUnmount(() => {
            this.cleanupEditor();
        });

        // 组件挂载后初始化
        onMounted(async () => {
            try {
                // 1. 加载 CropperJS 资源
                await this.loadCropperResources();
                // 2. 初始化编辑器
                await this.initCropperEditor();
            } catch (error) {
                console.error('Image cropper initialization failed:', error);
                this.state.hasError = true;
                this.state.errorMessage = _t("Editor failed to load: ") + error.message;
                this.state.isLoading = false;
            }
        });
    }

    // 裁剪模式按钮文案（模板中使用，需经 _t 翻译）
    get cropModeLabel() {
        return this.state.isCropping ? _t("Exit Crop") : "";
    }

    // 加载 CropperJS 资源（CSS + JS）
    async loadCropperResources() {
        // 超时控制（10秒）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(_t("Resource loading timed out, please check your network"))), 10000);
        });

        try {
            // 并行加载 CSS 和 JS，带超时控制
            await Promise.race([
                Promise.all([
                    loadCSS(CROPPER_CSS_URL), // 加载样式
                    loadJS(CROPPER_JS_URL)    // 加载脚本
                ]),
                timeoutPromise
            ]);

            // 验证 Cropper 是否挂载成功
            if (!window.Cropper) {
                throw new Error(_t("CropperJS library failed to load"));
            }
            this.Cropper = window.Cropper;
        } catch (error) {
            throw new Error(_t("Failed to load the image editor library: ") + error.message);
        }
    }

    // 初始化 Cropper 编辑器
    async initCropperEditor() {
        this.state.isLoading = true;
        this.state.hasError = false;

        try {
            const imageEl = this.imageRef();
            if (!imageEl) {
                throw new Error(_t("Image element not found"));
            }

            // 保存原始图片URL
            this.originalImageSrc = this.props.imageSrc;
            imageEl.src = this.originalImageSrc;

            // 等待图片加载完成
            await new Promise((resolve, reject) => {
                imageEl.onload = resolve;
                imageEl.onerror = () => reject(new Error(_t("Failed to load the image")));
            });

            // 销毁已有实例（防止重复初始化）
            if (this.cropper) {
                this.cropper.destroy();
            }

            // 创建 Cropper 实例（默认禁用裁剪）
            this.cropper = new this.Cropper(imageEl, {
                viewMode: 1, // 限制裁剪框在图片内
                dragMode: 'none', // 默认禁止拖动
                responsive: true, // 响应式布局
                restore: true, // 窗口调整大小后恢复裁剪区域
                checkCrossOrigin: true, // 处理跨域图片
                checkOrientation: true, // 自动校正EXIF旋转角度
                scalable: true, // 允许图片缩放
                zoomable: true, // 允许放大/缩小
                rotatable: true, // 允许旋转图片
                cropBoxMovable: true, // 允许拖动裁剪框
                cropBoxResizable: true, // 允许调整裁剪框大小
                toggleDragModeOnDblclick: false, // 禁用双击切换拖动模式
                autoCrop: false, // 初始不显示裁剪框
                highlight: true, // 裁剪框外显示高亮蒙版
                background: true, // 裁剪区域外显示网格状背景
                modal: true, // 裁剪框外显示半透明黑色蒙版
                guides: true, // 裁剪框内显示虚线辅助线
                center: true, // 裁剪框中心显示十字交叉线
                zoomOnWheel: false, // 禁用滚轮缩放（避免误操作）
                // 设置初始比例为图片原始比例，确保图片左上角对齐
                initialAspectRatio: imageEl.naturalWidth / imageEl.naturalHeight,
                // 禁用自动调整图片位置，让图片从左上角开始显示
                autoCropArea: 0,
            });

            // 强制将图片偏移量设为0，确保左上角对齐
            this.cropper.setData({
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                rotate: 0
            });

            this.state.isLoading = false;
        } catch (error) {
            this.state.hasError = true;
            this.state.errorMessage = _t("Editor initialization failed: ") + error.message;
            this.state.isLoading = false;
            throw error;
        }
    }

    // 切换裁剪模式
    toggleCropMode() {
        if (!this.cropper) return;

        this.state.isCropping = !this.state.isCropping;

        if (this.state.isCropping) {
            // 进入裁剪模式
            this.cropper.setDragMode('crop');
            this.cropper.enable();

            // 默认裁剪框大小为图片的80%
            const imageData = this.cropper.getImageData();
            const cropBoxData = {
                width: imageData.width * 0.8,
                height: imageData.height * 0.8,
                left: 0,
                top: 0
            };
            this.cropper.setCropBoxData(cropBoxData);

            // 确保图片始终左上角对齐
            this.cropper.setData({
                x: 0,
                y: 0
            });
        } else {
            // 退出裁剪模式
            this.cropper.setDragMode('none');
            this.cropper.disable();
            this.cropper.clear(); // 隐藏裁剪框
        }
    }

    // 更改裁剪比例
    changeCropRatio(e) {
        if (!this.cropper || !e.target) return;

        const ratio = e.target.value;
        if (ratio === 'free') {
            this.cropper.setAspectRatio(0); // 自由比例
        } else {
            const [w, h] = ratio.split(':').map(Number);
            this.cropper.setAspectRatio(w / h);
        }
    }

    // 裁剪框居中
    centerCropBox() {
        if (!this.state.isCropping || !this.cropper) return;

        const imageData = this.cropper.getImageData();
        const cropBoxData = this.cropper.getCropBoxData();

        // 计算居中位置
        const centerX = (imageData.width - cropBoxData.width) / 2;
        const centerY = (imageData.height - cropBoxData.height) / 2;

        this.cropper.setCropBoxData({
            left: centerX,
            top: centerY
        });
    }

    // 应用裁剪（更新预览）
    applyCrop() {
        if (!this.cropper) return;

        try {
            this.state.isLoading = true;

            // 获取裁剪后的画布
            const croppedCanvas = this.cropper.getCroppedCanvas({
                imageSmoothingQuality: 'high' // 高质量缩放
            });

            // 更新图片显示（保留原始实例）
            const imageEl = this.imageRef();
            imageEl.src = croppedCanvas.toDataURL('image/png');

            // 重新初始化 Cropper（保持裁剪模式状态）
            this.cropper.destroy();
            this.cropper = new this.Cropper(imageEl, {
                viewMode: 1,
                dragMode: this.state.isCropping ? 'crop' : 'none',
                responsive: true,
                autoCrop: this.state.isCropping,
                highlight: true,
                background: true,
                modal: true,
                guides: true,
                center: true,
                initialAspectRatio: imageEl.naturalWidth / imageEl.naturalHeight,
                autoCropArea: 0,
            });

            // 重新设置图片左上角对齐
            this.cropper.setData({
                x: 0,
                y: 0
            });

            this.state.isLoading = false;
        } catch (error) {
            this.state.hasError = true;
            this.state.errorMessage = _t("Crop failed: ") + error.message;
            this.state.isLoading = false;
        }
    }

    // 向左旋转90度
    rotateLeft() {
        if (!this.cropper) return;
        this.cropper.rotate(-90);
    }

    // 向右旋转90度
    rotateRight() {
        if (!this.cropper) return;
        this.cropper.rotate(90);
    }

    // 水平翻转
    flipHorizontal() {
        if (!this.cropper) return;
        const scaleX = this.cropper.getData().scaleX || 1;
        this.cropper.scaleX(-scaleX);
    }

    // 垂直翻转
    flipVertical() {
        if (!this.cropper) return;
        const scaleY = this.cropper.getData().scaleY || 1;
        this.cropper.scaleY(-scaleY);
    }

    // 重置到原始图片
    resetEditor() {
        if (!this.originalImageSrc || !this.Cropper) return;

        this.state.isLoading = true;
        try {
            // 销毁现有实例
            if (this.cropper) {
                this.cropper.destroy();
            }

            // 恢复原始图片
            const imageEl = this.imageRef();
            imageEl.src = this.originalImageSrc;

            // 重新初始化
            this.cropper = new this.Cropper(imageEl, {
                viewMode: 1,
                dragMode: 'none',
                responsive: true,
                autoCrop: false,
                highlight: true,
                background: true,
                modal: true,
                guides: true,
                center: true,
                initialAspectRatio: imageEl.naturalWidth / imageEl.naturalHeight,
                autoCropArea: 0,
            });

            // 重置图片位置为左上角
            this.cropper.setData({
                x: 0,
                y: 0
            });

            // 重置状态
            this.state.isCropping = false;
            this.state.hasError = false;
            this.state.errorMessage = "";
            this.state.isLoading = false;
        } catch (error) {
            this.state.hasError = true;
            this.state.errorMessage = _t("Reset failed: ") + error.message;
            this.state.isLoading = false;
        }
    }

    // 保存编辑后的图片
    saveImage() {
        if (!this.cropper || this.state.isLoading) return;

        try {
            this.state.isLoading = true;

            // 获取编辑后的图片（WebP 格式，高质量）
            const editedCanvas = this.cropper.getCroppedCanvas({
                imageSmoothingQuality: 'high'
            });
            const imageData = editedCanvas.toDataURL('image/webp', 0.9); // 0.9 压缩质量

            // 提取 base64 数据（去掉前缀）
            const base64Data = imageData.split(',')[1];
            if (!base64Data) {
                throw new Error(_t("Unable to extract image data"));
            }

            // 调用保存回调
            if (typeof this.props.onSave === 'function') {
                this.props.onSave(base64Data);
            }

            // 关闭弹窗
            this.props.close();
        } catch (error) {
            this.state.hasError = true;
            this.state.errorMessage = _t("Save failed: ") + error.message;
            this.state.isLoading = false;
        }
    }

    // 清理资源
    cleanupEditor() {
        // 销毁 Cropper 实例
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        // 重置状态
        this.originalImageSrc = null;
        this.Cropper = null;
        this.state.isLoading = false;
        this.state.hasError = false;
        this.state.errorMessage = "";
        this.state.isCropping = false;
    }
}
