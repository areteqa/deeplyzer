const { chromium } = require('playwright');

class Exec {
    async init() {
        this.browser = null;
        this.page = null;

        await this._launch();
    }

    async execTestCase(testCase) {
        for (const [index, step] of testCase.steps.entries()) {

            try {
                // Set input values
                for (const input of step.inputs || []) {
                    await this._setElementValue(
                        input.element,
                        input
                    );
                }

                // Trigger action
                if (step.action) {
                    await this.triggerEvent(
                        step.action.element,
                        step.action.action
                    );
                }

            } catch (error) {
                throw new Error(
                    `Failed at step ${index + 1}: ${error.message}`,
                    { cause: error }
                );
            }
        }

        // Capture viewport HTML
        const html = await this.page.evaluate(() => {
            const elements = document.elementsFromPoint(
                window.innerWidth / 2,
                window.innerHeight / 2
            );

            return document.documentElement.outerHTML;
        });

        return html;
    }

    async triggerEvent(xpath, eventName) {
        return await this.page.evaluate(({ xpath, eventName }) => {

            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );

            const el = result.singleNodeValue;

            if (!el) {
                throw new Error(`Element not found: ${xpath}`);
            }

            let evt;
            let dispatched = false;

            switch (eventName) {
                case 'click':
                    el.click();
                    dispatched = true;
                    break;

                case 'input':
                case 'change':
                case 'submit':
                case 'focus':
                case 'blur':
                    evt = new Event(eventName, {
                        bubbles: true,
                        cancelable: true
                    });
                    break;

                case 'keydown':
                case 'keyup':
                case 'keypress':
                    evt = new KeyboardEvent(eventName, {
                        bubbles: true,
                        cancelable: true
                    });
                    break;

                case 'mousedown':
                case 'mouseup':
                case 'mousemove':
                    evt = new MouseEvent(eventName, {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    break;

                default:
                    evt = new Event(eventName, {
                        bubbles: true,
                        cancelable: true
                    });
            }

            if (evt && !dispatched) {
                el.dispatchEvent(evt);
            }

        }, { xpath, eventName });
    }

    async _setElementValue(xpath, input) {
        return await this.page.evaluate(({ xpath, input }) => {

            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );

            const uiElement = result.singleNodeValue;

            if (!uiElement) {
                throw new Error(`Element not found: ${xpath}`);
            }

            if (
                uiElement.type === 'radio' ||
                uiElement.type === 'checkbox'
            ) {
                const value = String(input.value).toLowerCase();

                if (value === 'true' || value === 'false') {
                    uiElement.checked = value === 'true';
                } else {
                    uiElement.checked = input.value == uiElement.value;
                }

            } else if (uiElement.matches('input, textarea, select')) {

                let prototype = Object.getPrototypeOf(uiElement);
                let descriptor;

                while (prototype && !descriptor) {
                    descriptor = Object.getOwnPropertyDescriptor(
                        prototype,
                        'value'
                    );

                    prototype = Object.getPrototypeOf(prototype);
                }

                if (descriptor?.set) {
                    descriptor.set.call(uiElement, input.value);
                } else {
                    uiElement.value = input.value;
                }

            } else {
                throw new Error(`Element does not support value: ${xpath}`);
            }

            uiElement.dispatchEvent(
                new Event('input', { bubbles: true })
            );

            uiElement.dispatchEvent(
                new Event('change', { bubbles: true })
            );

        }, { xpath, input });
    }

    async _launch() {
        this.browser = await chromium.launch({
            headless: false
        });

        const context = await this.browser.newContext();
        this.page = await context.newPage();

        return this;
    }

    async navigate(url) {
        if (!this.page) {
            throw new Error('WebEngine is not launched. Call launch() first.');
        }

        await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Wait for the page to finish its initial rendering.
        await new Promise(resolve => setTimeout(resolve, 2000));

        return this.page.title();
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}

module.exports = Exec;