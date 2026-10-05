/** @odoo-module **/
import {Component, effect, onMounted, onWillStart, onWillUnmount, signal, t, useProps} from "@odoo/owl";
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";
import {standardActionServiceProps} from "@web/webclient/actions/action_plugin";
import {Dropdown} from "@web/core/dropdown/dropdown";
import {DropdownItem} from "@web/core/dropdown/dropdown_item";
import {_t} from "@web/core/l10n/translation";

const IFRAME_LOAD_TIMEOUT = 8000;
const MINDMAP_URL = "/qs_iframe/static/mind-map-main/index.html";

export class IframeMindComponent extends Component {
    static template = "qs_iframe.IframeMindComponent";
    static components = {Dropdown, DropdownItem};

    props = useProps(standardActionServiceProps);

    urlOptions = signal([], {
        type: t.array(
            t.object({
                id: t.number(),
                name: t.string(),
                value: t.string(),
            })
        ),
    });
    selectedId = signal(0, {type: t.number()});
    selectedName = signal("", {type: t.string()});
    selectedUrl = signal("", {type: t.string()});
    isLoading = signal(true, {type: t.boolean()});
    isIframeLoading = signal(false, {type: t.boolean()});
    iframeRef = signal.ref();
    reloadToken = signal(0, {type: t.number()});
    mindMapConfig = signal(null);
    localConfig = signal(null);
    lang = signal(null);

    hasUnsavedChange = signal(false, {type: t.boolean()});
    pendingMindPayload = signal(null);
    isSaving = signal(false, {type: t.boolean()});

    setup() {
        this.orm = useService("orm");
        this.notificationService = useService("notification");
        this._iframeLoadTimer = null;
        this._disposed = false;
        this.msgHandler = null;
        this._loadedPayload = null;

        this.context = this.props.action.context || {};
        this.resModel = this.context.active_model;
        this.active_id = this.context.active_id;
        this.display_name = signal(this.context.display_name || "", {type: t.string()});
        console.log("PG-OWL:", this.resModel, this.active_id);
        effect(() => {
            const token = this.reloadToken();
            const iframe = this.iframeRef();
            if (!iframe) {
                return;
            }
            const absUrl = new URL(
                token > 0 ? `${MINDMAP_URL}?_r=${token}` : MINDMAP_URL,
                window.location.origin
            ).href;
            if (iframe.src === absUrl) {
                return;
            }
            this._startLoadingFeedback();
            iframe.src = absUrl;
        });

        onMounted(() => {
            this.msgHandler = async (e) => {
                const {action, payload} = e.data || {};
                if (action === "html_request_load") {
                    await this.handleRequestLoad();
                    return;
                }
                if (action === "html_app_ready") {
                    this.onAppReady();
                    return;
                }
                if (action === "html_notification") {
                    this.notificationService.add(
                        payload,
                        {title: _t("HTML Notification:"), type: "success"}
                    );
                    return;
                }
                const saveTargets = {
                    html_saveMindMapData: ["mindMapData", this.pendingMindPayload],
                    html_saveMindMapConfig: ["mindMapConfig", this.mindMapConfig],
                    html_saveLanguage: ["lang", this.lang],
                    html_saveLocalConfig: ["localConfig", this.localConfig],
                };
                const target = saveTargets[action];
                if (target && payload !== undefined && !this._isSameAsLoaded(target[0], payload)) {
                    target[1].set(payload);
                    this.hasUnsavedChange.set(true);
                }
            };
            window.addEventListener("message", this.msgHandler);
        });

        onWillStart(() => this.loadIframeList());

        onWillUnmount(() => {
            this._disposed = true;
            this._clearIframeLoadTimer();
            if (this.msgHandler) {
                window.removeEventListener("message", this.msgHandler);
                this.msgHandler = null;
            }
        });
    }

    _isSameAsLoaded(field, payload) {
        if (!this._loadedPayload) {
            return false;
        }
        const loaded = this._loadedPayload[field] ?? null;
        try {
            return JSON.stringify(payload ?? null) === JSON.stringify(loaded);
        } catch (err) {
            return false;
        }
    }

    async handleRequestLoad() {
        try {
            const mindData = await this.orm.call(
                "qs.mind.map",
                "get_mindmap_data",
                [this.active_id]
            );
            this._loadedPayload = mindData;
            const iframe = this.iframeRef();
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                    action: "OWL_HTML",
                    payload: mindData
                }, "*");
            }
            this.hasUnsavedChange.set(false);
            this.pendingMindPayload.set(null);
            this.mindMapConfig.set(null);
            this.localConfig.set(null);
            this.lang.set(null);
        } catch (err) {
            console.error("Failed to load mind map", err);
        }
    }

    async onClickManualSave() {
        if (!this.hasUnsavedChange() || this.isSaving()) return;
        const loaded = this._loadedPayload || {};
        const submitPayload = {
            mindMapData: this.pendingMindPayload() ?? loaded.mindMapData,
            mindMapConfig: this.mindMapConfig() ?? loaded.mindMapConfig,
            localConfig: this.localConfig() ?? loaded.localConfig ?? null,
            lang: this.lang() ?? loaded.lang ?? "zh",
        };
        if (!submitPayload.mindMapData) {
            return;
        }

        this.isSaving.set(true);
        try {
            await this.orm.call(
                "qs.mind.map",
                "set_mindmap_data",
                [this.active_id, submitPayload]
            );

            this.notificationService.add(
                _t("Mind map saved successfully"),
                {title: "OK", type: "success"}
            );
            this._loadedPayload = submitPayload;
            this.hasUnsavedChange.set(false);
            this.pendingMindPayload.set(null);
            this.mindMapConfig.set(null);
            this.localConfig.set(null);
            this.lang.set(null);
        } catch (err) {
            console.error(err);
            this.notificationService.add(
                _t("Failed to save mind map"),
                {title: String(err), type: "danger"}
            );
        } finally {
            this.isSaving.set(false);
        }
    }

    async loadIframeList() {
        this.isLoading.set(true);
        try {
            const records = await this.orm.searchRead(
                "qs.iframe",
                [["active", "=", true]],
                ["id", "name", "url", "sequence"],
                {order: "sequence, id"}
            );
            const options = records
                .map((rec) => ({
                    id: rec.id,
                    name: rec.name || rec.url,
                    value: (rec.url || "").trim(),
                }))
                .filter((opt) => opt.value);
            this.urlOptions.set(options);
            const current = options.find((opt) => opt.id === this.selectedId());
            this.selectOption(current || options[0]);
        } catch (err) {
            console.error("[qs_iframe] failed to load the iframe list:", err);
            this.urlOptions.set([]);
            this.resetSelection();
        } finally {
            this.isLoading.set(false);
        }
    }

    resetSelection() {
        this.selectedId.set(0);
        this.selectedName.set("");
        this.selectedUrl.set("");
        this._clearIframeLoadTimer();
        this.isIframeLoading.set(false);
    }

    selectOption(option) {
        if (!option) {
            this.resetSelection();
            return;
        }
        this.selectedId.set(option.id);
        this.selectedName.set(option.name);
        this.selectedUrl.set(option.value);
    }

    onSelectItem(option) {
        if (!option || option.id === this.selectedId()) {
            return;
        }
        this.selectOption(option);
    }

    onRefresh() {
        this.reloadToken.set(this.reloadToken() + 1);
    }

    _startLoadingFeedback() {
        this.isIframeLoading.set(true);
        this._clearIframeLoadTimer();
        this._iframeLoadTimer = setTimeout(() => {
            if (!this._disposed) {
                this.isIframeLoading.set(false);
            }
        }, IFRAME_LOAD_TIMEOUT);
    }

    _clearIframeLoadTimer() {
        if (this._iframeLoadTimer) {
            clearTimeout(this._iframeLoadTimer);
            this._iframeLoadTimer = null;
        }
    }

    onIframeLoad() {
        this._clearIframeLoadTimer();
        this._iframeLoadTimer = setTimeout(() => {
            if (!this._disposed) {
                this.isIframeLoading.set(false);
            }
        }, IFRAME_LOAD_TIMEOUT);
    }

    onAppReady() {
        this._clearIframeLoadTimer();
        this.isIframeLoading.set(false);
    }
}

registry.category("actions").add("qs_iframe.iframe_mind", IframeMindComponent);
