================
Image Cropper
================

.. image:: static/description/icon.png
   :alt: Image Cropper Widget
   :align: center

Powerful OWL-based custom image field widget for **Odoo 19 & Odoo 20**, built on CropperJS.
Add image crop, rotate, flip and fullscreen preview to your binary / many2one image fields.

Key Features
------------
* Built-in modal image editor powered by CropperJS
    - Image cropping, support free ratio and fixed aspect ratio
    - Rotate 90° left/right, horizontal & vertical flip
    - High quality canvas rendering to preserve image clarity
* Full-screen image preview popup
    - Drag to pan image, double-click for zoom
    - Rotate view, reset position, download original image
    - Image print, browser native share function
* Automatic image optimization
    - Optional auto convert uploaded images to WebP to save storage and bandwidth
    - Auto generate multi-resolution attachments (1920 / 1024 / 512 / 256 / 128)
    - Generate JPEG fallback copies for PDF report compatibility
* Compatibility
    - Support standard binary image field
    - Support many2one attachment image field
    - Mobile responsive with touch support
    - Fully compatible with Odoo 19 and Odoo 20

Use Cases
---------
Product photos, contact avatars, document photos, signature uploads, Studio custom image fields, and more.

----

图片裁剪组件 Image Cropper
============================

基于 OWL + CropperJS 开发，适配 **Odoo19 / Odoo20** 的自定义图片字段组件，
为二进制字段、many2one附件图片字段提供图片裁剪、旋转、翻转、全屏预览能力。

核心功能
--------
* 内置弹窗图片编辑器
    - 图片裁剪，支持自由比例、自定义固定宽高比
    - 左右90度旋转、水平/垂直翻转
    - 高质量画布渲染，保留原图清晰度
* 全屏大图预览弹窗
    - 鼠标拖拽平移图片，双击放大
    - 视图旋转、位置重置、原图下载
    - 图片打印、浏览器原生分享
* 图片自动优化处理
    - 可选自动转WebP格式，节省存储空间与带宽
    - 自动生成多分辨率附件（1920 / 1024 / 512 / 256 / 128）
    - 生成JPEG备用副本，兼容PDF报表导出
* 兼容性
    - 支持标准binary二进制图片字段
    - 支持many2one附件图片字段
    - 移动端适配，支持触屏操作
    - Odoo19、Odoo20 双版本兼容

适用场景
--------
产品图片、联系人头像、证件照片、签名上传、Studio自定义图片字段等场景。

----

Usage / 使用方法
----------------
1. Install the module.
2. In Studio / XML view, use widget="image_cropper" for your image field.
3. Upload image and click edit button to open cropper modal.
4. Preview image by clicking on the thumbnail.

1. 安装本模块
2. 在Studio或者XML视图中，图片字段添加属性 widget="image_cropper"
3. 上传图片，点击编辑按钮打开裁剪弹窗
4. 点击缩略图即可唤起大图预览

.. note::
    * Enable "Convert to WebP" in field options for automatic image compression.
    * This widget works for both binary fields and many2one attachment image fields.

.. 注意::
    * 在字段选项开启「Convert to WebP」，启用图片自动压缩转换
    * 该组件同时支持 binary 字段 和 many2one 附件图片字段
