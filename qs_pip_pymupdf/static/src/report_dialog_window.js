/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
import { Dialog } from "@web/core/dialog/dialog";
import { Component, useListener, useProps, t } from "@odoo/owl";

//弹窗模板组件
export class ReportDialogWindow extends Component {
    static template = "qs_pip_pymupdf.report_pdf_options";
    static components = { Dialog };

    // Odoo20 (OWL3) 使用 useProps 声明组件属性校验
    props = useProps({
        onSelectOption: t.function(),
        close: t.function().optional(),
    });

    setup() {
        this.title = _t("What do you want to do?");
        // Odoo20 (OWL3) 中 useExternalListener 已移除，改用 useListener(target, eventName, handler)
        useListener(document, "keyup", (ev) => {
            if (ev.key === "Escape") {
                this.props.close?.();
            }
        });
    }

    executePdfAction(option) {
        this.props.onSelectOption(option);
        this.props.close?.();
    }
}
