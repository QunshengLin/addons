{
    "name": "PyMuPDF Render PDF pages to images",
    "summary": "PyMuPDF PDF to Image Converter for Odoo Reports",
    "description": """
    This module extends Odoo native QWeb PDF reporting features.
    Powered by PyMuPDF, it renders generated PDF report pages into high-resolution PNG images.

    Features:
    - Four report action modes: Print, Download, Open, OG Render.
    - Convert PDF pages to PNG preview with Open Graph & WeChat social meta tags for shareable preview cards.
    - Safe PDF rendering with 60s timeout and 50MB maximum file size limit to avoid server stuck.
    - Frontend OWL3 dialog to select report operation.
    - Automatic fallback to HTML view when PDF rendering engine fails.

    Requirement: Install python package pymupdf.
    Command: pip install pymupdf
    """,
    "author": "441785369@qq.com",
    "website": "https://apps.odoo.com/apps/modules/browse?series=20.0&price=Free&search=PyMuPDF",
    "category": "Customizations/Studio",
    "version": "20.0.1.0.0",
    "depends": ["base", "web"],
    "data": [
        "views/views.xml",
    ],
    "license": "LGPL-3",
    "external_dependencies": {"python": ["PyMuPDF"]},
    "assets": {
        "web.assets_backend": [
            "qs_pip_pymupdf/static/src/**/*",
        ],
    },
    'price': 9.99,
    'currency': 'EUR',
    "images": ["static/description/app.gif","static/description/icon.png",],
    "application": True,
    "installable": True,
    "auto_install": False,
}
