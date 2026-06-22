{
    "name": "China ICP Filing Number",
    "version": "19.0.1.2",
    "category": "Customizations/Studio",
    "summary": "Display the ICP number on the login page",
    "website": "https://apps.odoo.com/apps/modules/browse?series=19.0&search=cn_icp",
    "description": """
Usage instructions:Usage:
Go to Technology -> Settings -> System Parameters, locate the variable names cn_icp.public_security_number and cn_icp.number, set the public security number and your own ICP registration number accordingly.

Tips:
1. Regulatory authorities only require the ICP number to be displayed on the homepage (without an account, they cannot access other pages), so you only need to modify one location—the login page.
2. This module is only applicable if the website module has not been installed; otherwise, the homepage will no longer be the login page.
    """,
    "author": "441785369@qq.com",
    "license": "LGPL-3",
    "depends": ["base", "web"],
    "data": [
        "views/icp_template.xml",
    ],
    "price": 0.00,
    "currency": "EUR",
    "post_init_hook": "post_init_hook",
    "images": ["static/description/banner.gif","static/description/icon.png",],
}
