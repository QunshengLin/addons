/** @odoo-module **/
import { Component, effect, onWillStart, onWillUnmount, signal, t, useProps } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardActionServiceProps } from "@web/webclient/actions/action_plugin";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";

// Fallback timeout: remove the overlay even if the load event never fires
// (e.g. blocked by browser security policies), to avoid a permanent white screen
const IFRAME_LOAD_TIMEOUT = 8000;

export class IframeComponent extends Component {
    static template = "qs_iframe.IframeComponent";
    static components = { Dropdown, DropdownItem };

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
    selectedId = signal(0, { type: t.number() });
    selectedName = signal("", { type: t.string() });
    selectedUrl = signal("", { type: t.string() });
    isLoading = signal(true, { type: t.boolean() });
    isIframeLoading = signal(false, { type: t.boolean() });
    // Owl 3: signal.ref() replaces useRef(); value is the mounted DOM element or null
    iframeRef = signal.ref();
    // Reload token: incremented to force reloading the same URL
    reloadToken = signal(0, { type: t.number() });

    setup() {
        this.orm = useService("orm");
        this._iframeLoadTimer = null;
        this._disposed = false;
        this._lastToken = 0;

        // Reactive navigation: runs whenever selectedUrl changes or the iframe
        // element becomes available. Solves the timing issue where the iframe
        // (inside a t-if branch) is not yet mounted during onMounted.
        effect(() => {
            const url = this.selectedUrl();
            const token = this.reloadToken();
            const iframe = this.iframeRef();
            if (!url || !iframe) {
                return;
            }
            // Compare absolute URLs (iframe.src returns an absolute address)
            const absUrl = new URL(url, window.location.origin).href;
            if (iframe.src === absUrl && token === this._lastToken) {
                return;
            }
            this._lastToken = token;
            this._startLoadingFeedback();
            iframe.src = url;
        });

        onWillStart(() => this.loadIframeList());
        onWillUnmount(() => {
            this._disposed = true;
            this._clearIframeLoadTimer();
        });
    }

    async loadIframeList() {
        this.isLoading.set(true);
        try {
            const records = await this.orm.searchRead(
                "qs.iframe",
                [["active", "=", true]],
                ["id", "name", "url", "sequence"],
                { order: "sequence, id" }
            );
            const options = records
                .map((rec) => ({
                    id: rec.id,
                    name: rec.name || rec.url,
                    value: (rec.url || "").trim(),
                }))
                .filter((opt) => opt.value);
            this.urlOptions.set(options);
            // Keep the current selection if still valid, otherwise fall back to the first item
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
        if (!this.selectedUrl()) {
            return;
        }
        // Reassigning the same src also triggers an iframe reload
        this.reloadToken.set(this.reloadToken() + 1);
    }

    _startLoadingFeedback() {
        this.isIframeLoading.set(true);
        this._clearIframeLoadTimer();
        // Fallback: even if the load event never fires (blocked by browser
        // security policies), remove the overlay after the timeout
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
        this.isIframeLoading.set(false);
    }
}

registry.category("actions").add("qs_iframe.iframe", IframeComponent);
