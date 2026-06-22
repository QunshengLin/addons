/** @odoo-module */
import { isMobileOS } from "@web/core/browser/feature_detection";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { imageUrl } from "@web/core/utils/urls";
import { isBinarySize } from "@web/core/utils/binary";
import { FileUploader } from "@web/views/fields/file_handler";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import {
    Component,
    useState,
    onWillRender,
    xml,
    onMounted,
    onWillUnmount
} from "@odoo/owl";
const { DateTime } = luxon;
import { initBaseOGTags } from "../utils/og_tags";
import { removeEnlargedImage } from "../utils/dom_utils";
import { img_click } from "../utils/dom_utils";
import { fileTypeMagicWordMap, PLACEHOLDER_IMAGE } from "../constants";
import { SimpleImageEditorDialog } from "./cropper";


export class PhotoImageField extends Component {
    static template = "web_widget_preview_image.PhotoImageField";

    static components = {
        FileUploader,
    };

    static props = {
        ...standardFieldProps,
        alt: { type: String, optional: true },
        enableZoom: { type: Boolean, optional: true },
        imgClass: { type: String, optional: true },
        zoomDelay: { type: Number, optional: true },
        previewImage: { type: String, optional: true },
        acceptedFileExtensions: { type: String, optional: true },
        width: { type: Number, optional: true },
        height: { type: Number, optional: true },
        reload: { type: Boolean, optional: true },
        convertToWebp: { type: Boolean, optional: true },
        // 图片编辑增加
        enableFabricEdit: { type: Boolean, optional: true, default: true },
    };

    static defaultProps = {
        acceptedFileExtensions: "image/*",
        alt: _t("Binary file"),
        imgClass: "",
        reload: true,
        // 图片编辑增加
        enableFabricEdit: true,
    };

    setup() {
        this.notification = useService("notification");
        this.orm = useService("orm");
        this.isMobile = isMobileOS();
        this.dialog = useService("dialog");
        this.state = useState({
            isValid: true,
        });
        this.lastURL = undefined;

        // 初始化基础OG标签
        initBaseOGTags();

        onMounted(async () => { });

        onWillUnmount(() => {
            removeEnlargedImage();
        });

        if (this.fieldType === "many2one" && !this.props.previewImage) {
            throw new Error(
                "PhotoImageField: previewImage must be provided when set on a many2one field"
            );
        }
        const field = this.props.record.fields[this.props.name];
        if (field.related?.includes(".")) {
            this.uniqueId = DateTime.now();
            let key = this.props.record.data[this.props.name];
            onWillRender(() => {
                const nextKey = this.props.record.data[this.props.name];
                if (key !== nextKey) {
                    this.uniqueId = DateTime.now();
                }
                key = nextKey;
            });
        }
    }

    // 打开图片编辑器
    async openImageEditor() {
        try {
            // 获取图片URL
            const imageSrc = this.getImageSrcForEditor();
            if (!imageSrc) {
                this.notification.add(_t('没有可编辑的图片数据'), {
                    type: 'warning'
                });
                return;
            }

            // 打开编辑器弹窗
            this.dialog.add(SimpleImageEditorDialog, {
                imageSrc: imageSrc,
                record: this.props.record,
                name: this.props.name,
                onSave: this.onEditorSave.bind(this),
                close: () => {
                    this.notification.add(_t('编辑已取消'), {
                        type: 'info',
                        sticky: false
                    });
                }
            });
        } catch (error) {
            this.notification.add(_t('加载图片编辑器失败：') + error.message, {
                type: 'danger'
            });
        }
    }

    // 获取编辑器用的图片URL
    getImageSrcForEditor() {
        const imageData = this.props.record.data[this.props.name];
        if (!imageData) return null;

        if (imageData.startsWith('/web/image')) {
            // 加时间戳避免缓存
            return imageData + (imageData.includes('?') ? '&' : '?') + 't=' + Date.now();
        } else if (isBinarySize(imageData)) {
            return imageUrl(
                this.props.record?.resModel || '',
                this.props.record?.resId || '',
                this.props.name || '',
                { unique: Date.now() }
            );
        } else if (imageData.startsWith('data:image/')) {
            return imageData;
        } else {
            // 二进制数据转 base64 URL
            const magic = fileTypeMagicWordMap[imageData[0]] || "png";
            return `data:image/${magic};base64,${imageData}`;
        }
    }

    // 编辑器保存回调
    async onEditorSave(editedData) {
        try {
            // 构造上传信息
            const info = {
                data: editedData,
                type: "image/webp",
                name: `edited_${Date.now()}.webp`
            };

            // WebP 转换处理
            if (this.props.convertToWebp) {
                const image = document.createElement("img");
                image.src = `data:image/webp;base64,${editedData}`;
                await new Promise((resolve) => {
                    image.onload = resolve;
                    image.onerror = resolve;
                });

                const originalSize = Math.max(image.width, image.height);
                const smallerSizes = [1024, 512, 256, 128].filter((size) => size < originalSize);
                let referenceId = undefined;

                // 生成不同尺寸的图片
                for (const size of [originalSize, ...smallerSizes]) {
                    const ratio = size / originalSize;
                    const canvas = document.createElement("canvas");
                    canvas.width = image.width * ratio;
                    canvas.height = image.height * ratio;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) continue;

                    ctx.fillStyle = "transparent";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(
                        image,
                        0,
                        0,
                        image.width,
                        image.height,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    try {
                        // 创建 WebP 版本
                        const [resizedId] = await this.orm.call("ir.attachment", "create_unique", [
                            [
                                {
                                    name: info.name,
                                    description: size === originalSize ? "" : `resize: ${size}`,
                                    datas: size === originalSize
                                        ? editedData
                                        : canvas.toDataURL("image/webp", 0.75).split(",")[1],
                                    res_id: referenceId,
                                    res_model: "ir.attachment",
                                    mimetype: "image/webp",
                                },
                            ],
                        ]);
                        referenceId = referenceId || resizedId;

                        // 创建 JPEG 版本（用于PDF导出）
                        await this.orm.call("ir.attachment", "create_unique", [
                            [
                                {
                                    name: info.name.replace(/\.webp$/, ".jpg"),
                                    description: "format: jpeg",
                                    datas: canvas.toDataURL("image/jpeg", 0.75).split(",")[1],
                                    res_id: resizedId,
                                    res_model: "ir.attachment",
                                    mimetype: "image/jpeg",
                                },
                            ],
                        ]);
                    } catch (e) {
                        console.error('创建图片附件失败:', e);
                    }
                }
            }

            // 更新记录
            this.props.record.update({ [this.props.name]: editedData })
        } catch (error) {
            console.error('保存编辑图片失败:', error);
            this.notification.add(_t('保存编辑后的图片失败：') + error.message, {
                type: 'danger'
            });
        }
    }
    // 打开自定义图片预览
    openCustomImagePreview(ev) {
        if (ev) {
            ev.stopPropagation();
            ev.preventDefault();
        }

        if (!this.props.record.data[this.props.name] || !this.state.isValid) {
            return;
        }

        try {
            let targetImg = document.querySelector(`img[name="${this.props.name}"][loading="lazy"]`);

            if (!targetImg) {
                targetImg = document.createElement('img');
                targetImg.src = this.getUrl(this.props.previewImage || this.props.name);
                targetImg.tagName = 'IMG';
            }

            const mockEvent = {
                target: targetImg,
                stopPropagation: () => { },
                preventDefault: () => { }
            };

            img_click(mockEvent, this);
        } catch (error) {
            this.notification.add(_t('图片预览失败：') + error.message, {
                type: 'danger'
            });
            console.error('自定义图片预览初始化失败:', error);
        }
    }

    // 获取图片alt属性
    get imgAlt() {
        if (this.fieldType === "many2one" && this.props.record.data[this.props.name]) {
            return this.props.record.data[this.props.name].display_name;
        }
        return this.props.alt;
    }

    // 获取图片样式类
    get imgClass() {
        return ["img", "img-fluid"].concat(this.props.imgClass.split(" ")).join(" ");
    }

    // 获取字段类型
    get fieldType() {
        return this.props.record.fields[this.props.name].type;
    }

    // 获取缓存key
    get rawCacheKey() {
        return this.uniqueId || this.props.record.data.write_date;
    }

    // 获取尺寸样式
    get sizeStyle() {
        let style = "";
        if (this.props.width) {
            style += `max-width: ${this.props.width}px;`;
            if (!this.props.height) {
                style += `height: auto; max-height: 100%;`;
            }
        }
        if (this.props.height) {
            style += `max-height: ${this.props.height}px;`;
            if (!this.props.width) {
                style += `width: auto; max-width: 100%;`;
            }
        }
        return style;
    }

    // 计算属性：是否显示 tooltip
    get hasTooltip() {
        return this.props.enableZoom && this.props.record.data[this.props.name];
    }

    // 计算属性：tooltip 配置
    get tooltipAttributes() {
        const fieldName = this.fieldType === "many2one" ? this.props.previewImage : this.props.name;
        return {
            template: "web.ImageZoomTooltip",
            info: JSON.stringify({ url: this.getUrl(fieldName) }),
        };
    }

    // 获取图片URL
    getUrl(imageFieldName) {
        if (!this.props.reload && this.lastURL) {
            return this.lastURL;
        }
        if (!this.props.record.data[this.props.name] || !this.state.isValid) {
            return PLACEHOLDER_IMAGE;
        }
        if (this.fieldType === "many2one") {
            this.lastURL = imageUrl(
                this.props.record.fields[this.props.name].relation,
                this.props.record.data[this.props.name].id,
                imageFieldName,
                { unique: this.rawCacheKey }
            );
        } else if (isBinarySize(this.props.record.data[this.props.name])) {
            this.lastURL = imageUrl(
                this.props.record.resModel,
                this.props.record.resId,
                imageFieldName,
                { unique: this.rawCacheKey }
            );
        } else {
            const magic = fileTypeMagicWordMap[this.props.record.data[this.props.name][0]] || "png";
            this.lastURL = `data:image/${magic};base64,${this.props.record.data[this.props.name]}`;
        }
        return this.lastURL;
    }

    // 删除文件
    onFileRemove() {
        this.state.isValid = true;
        this.props.record.update({ [this.props.name]: false });
    }

    // 文件上传处理
    async onFileUploaded(info) {
        this.state.isValid = true;
        if (
            this.props.convertToWebp &&
            !["image/gif", "image/svg+xml", "image/webp"].includes(info.type)
        ) {
            const image = document.createElement("img");
            image.src = `data:${info.type};base64,${info.data}`;
            await new Promise((resolve) => image.addEventListener("load", resolve));

            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);

            info.data = canvas.toDataURL("image/webp", 0.75).split(",")[1];
            info.type = "image/webp";
            info.name = info.name.replace(/\.[^/.]+$/, ".webp");
        }
        if (info.type === "image/webp") {
            const image = document.createElement("img");
            image.src = `data:image/webp;base64,${info.data}`;
            await new Promise((resolve) => image.addEventListener("load", resolve));
            const originalSize = Math.max(image.width, image.height);
            const smallerSizes = [1024, 512, 256, 128].filter((size) => size < originalSize);
            let referenceId = undefined;
            for (const size of [originalSize, ...smallerSizes]) {
                const ratio = size / originalSize;
                const canvas = document.createElement("canvas");
                canvas.width = image.width * ratio;
                canvas.height = image.height * ratio;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "transparent";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(
                    image,
                    0,
                    0,
                    image.width,
                    image.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
                const [resizedId] = await this.orm.call("ir.attachment", "create_unique", [
                    [
                        {
                            name: info.name,
                            description: size === originalSize ? "" : `resize: ${size}`,
                            datas:
                                size === originalSize
                                    ? info.data
                                    : canvas.toDataURL("image/webp", 0.75).split(",")[1],
                            res_id: referenceId,
                            res_model: "ir.attachment",
                            mimetype: "image/webp",
                        },
                    ],
                ]);
                referenceId = referenceId || resizedId;
                await this.orm.call("ir.attachment", "create_unique", [
                    [
                        {
                            name: info.name.replace(/\.webp$/, ".jpg"),
                            description: "format: jpeg",
                            datas: canvas.toDataURL("image/jpeg", 0.75).split(",")[1],
                            res_id: resizedId,
                            res_model: "ir.attachment",
                            mimetype: "image/jpeg",
                        },
                    ],
                ]);
            }
        }
        this.props.record.update({ [this.props.name]: info.data });
    }

    // 图片加载失败处理
    onLoadFailed() {
        this.state.isValid = false;
    }
}