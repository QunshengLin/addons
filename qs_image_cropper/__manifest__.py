# -*- coding: utf-8 -*-
{
    "name": "Image Cropper",
    "version": "20.0.1.2.0",
    "category": "Customizations/Studio",
    "summary": "Image field widget with crop, rotate, flip and preview support",
    "description": """
    # Image Cropper
    Custom OWL image field widget for Odoo 19 & Odoo 20, built on CropperJS.

    ##  Core Functions
    1. Built-in Image Editor
    Open modal editor directly on form view:
    - Crop image with free or fixed aspect ratio
    - Rotate 90° left/right, horizontal & vertical flip
    - High quality canvas rendering for smooth image processing

    2. Full-Screen Image Preview
    Click image to open zoomable preview popup:
    - Drag to pan image, double-click zoom in
    - Rotate, reset view, download original image
    - Print image, native browser share support

    3. Automatic Image Optimization
    - Optional auto convert uploads to WebP for smaller file size
    - Auto generate multiple resolution attachments (1920 / 1024 / 512 / 256 /128)
    - Generate JPEG fallback copy for PDF report rendering compatibility

    ##  Compatibility
    - Works on standard binary fields
    - Supports many2one attachment image fields
    - Mobile responsive, touch screen support
    - Odoo 19 / Odoo 20 compatible

    ##  Use Cases
    Product photos, contact avatar, document pictures, signature upload, custom studio image fields and more.
    """,
    "author": "441785369@qq.com",
    "website": "https://apps.odoo.com/apps/modules/browse?series=19.0&price=Free&search=Image",
    "depends": ["base", "web"],
    "assets": {
        "web.assets_backend": [
            "qs_image_cropper/static/lib/cropperjs/cropper.min.css",
            "qs_image_cropper/static/src/**/*",
        ]
    },
    'company': 'ShengJiaYa',
    'maintainer': 'ShengJiaYa',
    'price': 9.99,
    'currency': 'EUR',
    "images": ["static/description/banner.gif","static/description/icon.png",],
    "license": "LGPL-3",
    "installable": True,
    "auto_install": False,
    "application": True,
}
