/** @odoo-module */
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { imageUrl } from "@web/core/utils/urls";
import { generateImageVariants } from "@web/core/utils/image_library";
import { ImageField, imageField, imageFieldProps } from "@web/views/fields/image/image_field";
import { onWillRender, onWillUnmount, t, useProps } from "@odoo/owl";
const { DateTime } = luxon;
import { removeEnlargedImage, img_click } from "./image_preview";
import { fileTypeMagicWordMap, getBinaryContent, getBinaryChecksum } from "./utils";
import { ImageCropperDialog } from "./image_cropper_dialog";

export const imageCropperFieldProps = {
    ...imageFieldProps,
    // 图片编辑
    enableFabricEdit: t.boolean().optional(true),
};

// 继承原生 ImageField：
// 尺寸处理（sizeStyle / options.size / width / height）、URL 生成、占位图、
// WebP 自动转换、多分辨率变体生成、文件上传/删除等逻辑全部复用原生实现，
// 仅在模板上扩展「编辑」和「预览」按钮，保证与原生 image 组件行为一致。
export class ImageCropperField extends ImageField {
    static template = "qs_image_cropper.ImageCropperField";

    props = useProps(imageCropperFieldProps);

    setup() {
        super.setup();
        this.dialog = useService("dialog");

        // related 链字段：值变化时更新缓存标识，避免显示旧图
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

        onWillUnmount(() => {
            removeEnlargedImage();
        });
    }

    get rawCacheKey() {
        // related 字段用时间戳强制刷新缓存，其余情况走原生逻辑
        return this.uniqueId || super.rawCacheKey;
    }

    // 打开图片编辑器
    openImageEditor() {
        try {
            const imageSrc = this.getImageSrcForEditor();
            if (!imageSrc) {
                this.notification.add(_t("No image data available to edit"), {
                    type: "warning",
                });
                return;
            }

            this.dialog.add(ImageCropperDialog, {
                imageSrc: imageSrc,
                record: this.props.record,
                name: this.props.name,
                onSave: this.onEditorSave.bind(this),
                close: () => {
                    this.notification.add(_t("Editing cancelled"), {
                        type: "info",
                        sticky: false,
                    });
                },
            });
        } catch (error) {
            this.notification.add(_t("Failed to load the image editor: ") + error.message, {
                type: "danger",
            });
        }
    }

    // 获取编辑器用的图片URL
    getImageSrcForEditor() {
        const imageData = this.props.record.data[this.props.name];
        if (!imageData) {
            return null;
        }
        if (typeof imageData === "string" && imageData.startsWith("/web/image")) {
            // 加时间戳避免缓存
            return imageData + (imageData.includes("?") ? "&" : "?") + "t=" + Date.now();
        }
        if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
            return imageData;
        }
        // many2one 附件图片 → 通过关联记录的预览字段获取
        if (this.fieldType === "many2one") {
            return imageUrl(
                this.props.record.fields[this.props.name].relation,
                imageData.id,
                this.props.previewImage,
                { unique: Date.now() }
            );
        }
        // 内联 base64（对象形态取 content，字符串形态直接用）
        const content = getBinaryContent(imageData);
        if (content) {
            const magic = fileTypeMagicWordMap[content[0]] || "png";
            return `data:image/${magic};base64,${content}`;
        }
        // 附件存储 → 通过 /web/image 获取
        return imageUrl(this.props.record.resModel, this.props.record.resId, this.props.name, {
            unique: getBinaryChecksum(imageData) || Date.now(),
        });
    }

    // 编辑器保存回调：与原生上传 WebP 行为一致 ——
    // 通过原生 generateImageVariants + web_create_image_variants 生成多分辨率
    // WebP + JPEG 变体附件（供报表使用），并以原生 payload 格式写回记录
    async onEditorSave(editedData) {
        try {
            const name = `edited_${Date.now()}.webp`;

            const variants = await generateImageVariants({
                source: { data: editedData, mimetype: "image/webp" },
                name: name,
                smoothing: "high",
            });
            await this.orm.call("ir.attachment", "web_create_image_variants", [variants]);

            const { fileNameField, record } = this.props;
            const changes = {
                [this.props.name]: { filename: name, content: editedData },
            };
            if (this.fieldType !== "many2one" && fileNameField in record.fields) {
                changes[fileNameField] = name;
            }
            record.update(changes);
        } catch (error) {
            console.error("Failed to save the edited image:", error);
            this.notification.add(_t("Failed to save the edited image: ") + error.message, {
                type: "danger",
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
                targetImg = document.createElement("img");
                targetImg.src = this.getUrl(this.props.previewImage || this.props.name);
            }

            const mockEvent = {
                target: targetImg,
                stopPropagation: () => { },
                preventDefault: () => { },
            };

            img_click(mockEvent, this);
        } catch (error) {
            this.notification.add(_t("Image preview failed: ") + error.message, {
                type: "danger",
            });
            console.error("Custom image preview initialization failed:", error);
        }
    }
}

export const imageCropperField = {
    ...imageField,
    component: ImageCropperField,
    displayName: _t("Image (Cropper)"),
    // 字段容器类名按 widget 名生成（o_field_image_cropper），不会命中原生
    // .o_field_image 的样式约束（> div { width:100%; height:100% }，图片随单元格宽度
    // 收缩、透明图白底等）。追加 o_field_image 类以完全继承原生 image 的显示尺寸行为，
    // 避免上传大图时表单被撑开（同 many2many_tags_color_dot 的做法）。
    additionalClasses: ["o_field_image"],
    supportedOptions: [
        ...imageField.supportedOptions,
        {
            label: _t("Enable fabric edit"),
            name: "enable_fabric_edit",
            type: "boolean",
            default: true,
        },
    ],
    extractProps: ({ attrs, options }) => ({
        ...imageField.extractProps({ attrs, options }),
        enableFabricEdit: options.enable_fabric_edit !== false,
    }),
};

registry.category("fields").add("image_cropper", imageCropperField);
