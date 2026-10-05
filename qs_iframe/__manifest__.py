{
    "name": "MindMap & Excalidraw",
    "summary": "Embed web pages, mind maps and Excalidraw whiteboards in the Odoo backend, with data persisted in the Odoo database",
    "description": """
    Provides embedding capability within the Odoo backend. Administrators maintain a URL list for users to quickly switch pages via dropdown menu, with page refresh support.
    Built-in mind map module: supports online mind map editing with persistent data storage.
    Built-in Excalidraw whiteboard module: embeds Excalidraw canvas. Canvas changes are automatically saved with a delay to the Odoo database.
    Mind maps and whiteboards can be opened in a dedicated editing view with one click through form buttons. Frontend and backend communicate via a bridge.
    """,
    "author": "441785369@qq.com",
    "category": "Customizations/Studio",
    "version": "20.0.1.0.0",
    "depends": ["base", "web"],
    "data": [
        "security/ir.access.csv",
        # "data/data.xml",
        # "data/mind_map.xml",
        "views/views.xml",
        "views/mind.xml",
    ],
    "license": "LGPL-3",
    "assets": {
        "web.assets_backend": [
            "qs_iframe/static/src/**/*",
        ],
    },
    'price': 9.99,
    'currency': 'EUR',
    "images": ["static/description/app.gif","static/description/icon.png",],
}
