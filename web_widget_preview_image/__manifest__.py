# -*- coding: utf-8 -*-

{
    'name': 'Web Widget Image Preview',
    'version': '19.0.0.1',   
    'summary': 'Enhance ImageField with preview/zoom/rotate/download',
    'description': """
        This module extends Odoo's native ImageField with powerful preview features:
        - Click to preview images in full screen
        - Zoom in/out, rotate, drag images
        - Download, print, share images
        - Support mobile/desktop compatibility
        - No core code modification, non-intrusive patch
    """,
    "category": "Customizations/Studio",
    'author': '441785369@qq.com',
    'website': 'https://apps.odoo.com/apps/modules/browse?series=19.0&search=web_widget_image',
    'depends': ['base', 'web','product'],
    'assets': {
        'web.assets_backend': {
            # 'web_widget_preview_image/static/src/js/web_image_preview_widget.js',
            "web_widget_preview_image/static/src/views/fields/**/*",
        }
    },
    'data': [
        'views/product_template.xml'
    ],
    'price': 9.99,
    'currency': 'EUR',
    "images": ["static/description/banner.gif","static/description/icon.png",],
    'license': 'LGPL-3',
    'installable': True,
    'application': False,
    'auto_install': False
}
